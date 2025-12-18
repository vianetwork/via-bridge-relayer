import { GlobalHandler } from '../globalHandler';
import { Transaction, TransactionStatus } from '../../../entities/transactions.entity';
import {
  VaultControllerTransaction,
  VaultControllerTransactionStatus,
} from '../../../entities/vaultControllerTransaction.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import { appConfig } from '../../../utils/config';

/**
 * Handler responsible for checking stale pending transactions and updating their status
 * based on blockchain receipts.
 *
 * This handler:
 * 1. Fetches pending Transaction records older than PENDING_TX_TIMEOUT_MINUTES
 * 2. Fetches pending VaultControllerTransaction records older than PENDING_TX_TIMEOUT_MINUTES (VIA origin only)
 * 3. For each transaction, gets the receipt from the appropriate chain
 * 4. Updates status based on receipt:
 *    - receipt.status === 1: mark as appropriate success status
 *    - receipt.status === 0: mark as Failed
 *    - receipt is null: mark as Failed (transaction dropped/stuck)
 */
export class StalePendingTransactionHandler extends GlobalHandler {
  async handle(): Promise<boolean> {
    let hasProcessedItems = false;

    // Process stale Transaction entities
    const staleTxProcessed = await this.processStaleTransactions();
    if (staleTxProcessed) {
      hasProcessedItems = true;
    }

    // Process stale VaultControllerTransaction entities (only for Via origin)
    // VaultController transactions are always sent to ETH chain (L1)
    if (this.origin === BridgeOrigin.Via) {
      const staleVctProcessed = await this.processStaleVaultControllerTransactions();
      if (staleVctProcessed) {
        hasProcessedItems = true;
      }
    }

    return hasProcessedItems;
  }

  /**
   * Process stale pending Transaction entities
   */
  private async processStaleTransactions(): Promise<boolean> {
    const staleTransactions = await this.transactionRepository.getStalePendingTransactions(
      this.origin,
      appConfig.pendingTxTimeoutMinutes,
      this.transactionBatchSize
    );

    if (staleTransactions.length === 0) {
      return false;
    }

    logger.info('Processing stale pending transactions', {
      origin: this.origin,
      count: staleTransactions.length,
      timeoutMinutes: appConfig.pendingTxTimeoutMinutes,
    });

    let hasProcessedItems = false;

    for (const transaction of staleTransactions) {
      try {
        const result = await this.checkAndUpdateTransaction(transaction);
        if (result) {
          hasProcessedItems = true;
        }
      } catch (error) {
        logger.error('Error processing stale transaction', {
          transactionId: transaction.id,
          finalizedTxHash: transaction.finalizedTransactionHash,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return hasProcessedItems;
  }

  /**
   * Check transaction receipt and update status accordingly
   */
  private async checkAndUpdateTransaction(transaction: Transaction): Promise<boolean> {
    const txHash = transaction.finalizedTransactionHash;

    // Get receipt from destination chain
    // For ETH origin: destination is VIA (L2)
    // For VIA origin: destination is ETH (L1)
    const provider = this.destinationProvider;

    logger.debug('Checking receipt for stale transaction', {
      transactionId: transaction.id,
      txHash,
      origin: this.origin,
    });

    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt === null) {
      // Transaction not found - mark as Failed (dropped/stuck)
      logger.warn('Stale transaction not found on chain - marking as Failed', {
        transactionId: transaction.id,
        txHash,
        createdAt: transaction.createdAt,
      });

      await this.transactionRepository.updateStatus(
        transaction.id as number,
        TransactionStatus.Failed
      );
      return true;
    }

    if (receipt.status === 1) {
      // Transaction succeeded - mark as Finalized
      logger.info('Stale transaction confirmed successful - marking as Finalized', {
        transactionId: transaction.id,
        txHash,
        blockNumber: receipt.blockNumber,
      });

      await this.transactionRepository.updateStatus(
        transaction.id as number,
        TransactionStatus.Finalized,
        Number(receipt.blockNumber)
      );
      return true;
    }

    if (receipt.status === 0) {
      // Transaction failed on chain - mark as Failed
      logger.warn('Stale transaction failed on chain - marking as Failed', {
        transactionId: transaction.id,
        txHash,
        blockNumber: receipt.blockNumber,
      });

      await this.transactionRepository.updateStatus(
        transaction.id as number,
        TransactionStatus.Failed
      );
      return true;
    }

    return false;
  }

  /**
   * Process stale pending VaultControllerTransaction entities
   * VaultController transactions are always sent to ETH (L1)
   */
  private async processStaleVaultControllerTransactions(): Promise<boolean> {
    const staleTransactions =
      await this.vaultControllerTransactionRepository.getStalePendingTransactions(
        appConfig.pendingTxTimeoutMinutes,
        this.transactionBatchSize
      );

    if (staleTransactions.length === 0) {
      return false;
    }

    logger.info('Processing stale pending VaultControllerTransactions', {
      count: staleTransactions.length,
      timeoutMinutes: appConfig.pendingTxTimeoutMinutes,
    });

    let hasProcessedItems = false;

    for (const vct of staleTransactions) {
      try {
        const result = await this.checkAndUpdateVaultControllerTransaction(vct);
        if (result) {
          hasProcessedItems = true;
        }
      } catch (error) {
        logger.error('Error processing stale VaultControllerTransaction', {
          vctId: vct.id,
          txHash: vct.transactionHash,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return hasProcessedItems;
  }

  /**
   * Check VaultControllerTransaction receipt and update status accordingly
   */
  private async checkAndUpdateVaultControllerTransaction(
    vct: VaultControllerTransaction
  ): Promise<boolean> {
    const txHash = vct.transactionHash;

    // VaultController transactions are always on L1 (ETH)
    const provider = this.l1Provider;

    logger.debug('Checking receipt for stale VaultControllerTransaction', {
      vctId: vct.id,
      txHash,
      l1BatchNumber: vct.l1BatchNumber,
    });

    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt === null) {
      // Transaction not found - mark as Failed
      logger.warn('Stale VaultControllerTransaction not found on chain - marking as Failed', {
        vctId: vct.id,
        txHash,
        createdAt: vct.createdAt,
      });

      await this.vaultControllerTransactionRepository.updateStatus(
        vct.id as number,
        VaultControllerTransactionStatus.Failed
      );
      return true;
    }

    if (receipt.status === 1) {
      // Transaction succeeded - mark as Confirmed
      // Note: The WithdrawalStateUpdatedHandler will later move it to ReadyToClaim
      logger.info(
        'Stale VaultControllerTransaction confirmed successful - marking as Confirmed',
        {
          vctId: vct.id,
          txHash,
          blockNumber: receipt.blockNumber,
        }
      );

      await this.vaultControllerTransactionRepository.updateStatus(
        vct.id as number,
        VaultControllerTransactionStatus.Confirmed
      );
      return true;
    }

    if (receipt.status === 0) {
      // Transaction failed on chain - mark as Failed
      logger.warn('Stale VaultControllerTransaction failed on chain - marking as Failed', {
        vctId: vct.id,
        txHash,
        blockNumber: receipt.blockNumber,
      });

      await this.vaultControllerTransactionRepository.updateStatus(
        vct.id as number,
        VaultControllerTransactionStatus.Failed
      );
      return true;
    }

    return false;
  }
}
