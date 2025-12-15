import { ethers } from 'ethers';
import { GlobalHandler } from '../globalHandler';
import { TransactionStatus, Transaction } from '../../../entities/transactions.entity';
import { MessageWithdrawalExecuted } from '../../../entities/messageWithdrawalExecuted.entity';
import { VaultControllerTransactionStatus } from '../../../entities/vaultControllerTransaction.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import { appConfig } from '../../../utils/config';
import { VAULT_CONTROLLER_ABI } from '../../../contracts/VaultControler';

/**
 * Handler responsible for calling updateWithdrawalState on VaultController
 * for finalized Via origin transactions that have l1BatchNumber set.
 * 
 * Groups transactions by l1BatchNumber and sends a single updateWithdrawalState
 * call per batch with aggregated messageHashes and totalShares.
 */
export class VaultControllerUpdateHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    // This handler only applies to Via origin transactions
    if (this.origin !== BridgeOrigin.Via) {
      return false;
    }

    // Get finalized transactions that have l1BatchNumber
    const transactions = await this.transactionRepository.getFinalizedTransactionsWithL1BatchNumber(
      this.origin,
      this.transactionBatchSize
    );

    if (transactions.length === 0) {
      return false;
    }

    logger.debug('Processing finalized transactions with l1BatchNumber for VaultController update', {
      count: transactions.length
    });

    // Group transactions by l1BatchNumber
    const batchGroups = this.groupByL1BatchNumber(transactions);

    return await this.processBatches(batchGroups);
  }

  private groupByL1BatchNumber(transactions: Transaction[]): Map<number, Transaction[]> {
    const groups = new Map<number, Transaction[]>();
    
    for (const tx of transactions) {
      if (tx.l1BatchNumber === undefined || tx.l1BatchNumber === null) continue;
      
      const existing = groups.get(tx.l1BatchNumber) || [];
      existing.push(tx);
      groups.set(tx.l1BatchNumber, existing);
    }
    
    return groups;
  }

  private async processBatches(batchGroups: Map<number, Transaction[]>): Promise<boolean> {
    let hasProcessedItems = false;

    for (const [l1BatchNumber, transactions] of batchGroups) {
      try {
        logger.debug('Processing batch for VaultController update', {
          l1BatchNumber,
          transactionCount: transactions.length
        });

        // Get finalized transaction hashes to look up withdrawal events
        const finalizedHashes = transactions.map(tx => tx.finalizedTransactionHash);
        
        logger.debug('Looking up withdrawal events', {
          l1BatchNumber,
          finalizedHashes,
          transactionIds: transactions.map(tx => tx.id)
        });
        
        // Get the corresponding messageWithdrawalExecuted events
        const withdrawalEvents = await this.messageWithdrawalExecutedRepository.getEventsByTransactionHashes(finalizedHashes);

        logger.debug('Withdrawal events lookup result', {
          l1BatchNumber,
          foundEventsCount: withdrawalEvents.length,
          events: withdrawalEvents.map(e => ({
            id: e.id,
            txHash: e.transactionHash,
            vaultNonce: e.vaultNonce,
            shares: e.shares
          }))
        });

        if (withdrawalEvents.length === 0) {
          logger.warn('No withdrawal events found for batch - check if subgraph has indexed the L1 transaction', {
            l1BatchNumber,
            finalizedHashes
          });
          continue;
        }

        // Compute messageHashes and totalShares
        const { messageHashes, totalShares } = this.computeBatchData(withdrawalEvents);

        logger.info('Calling updateWithdrawalState on VaultController', {
          l1BatchNumber,
          messageHashCount: messageHashes.length,
          totalShares: totalShares.toString()
        });

        // Call updateWithdrawalState on VaultController
        const txHash = await this.callUpdateWithdrawalState(messageHashes, l1BatchNumber, totalShares);

        // Create VaultControllerTransaction record with Pending status
        const vaultControllerTx = await this.vaultControllerTransactionRepository.createTransaction({
          transactionHash: txHash,
          l1BatchNumber,
          totalShares: totalShares.toString(),
          messageHashCount: messageHashes.length,
          status: VaultControllerTransactionStatus.Pending
        });

        logger.info('Created VaultControllerTransaction record', {
          id: vaultControllerTx.id,
          transactionHash: txHash,
          l1BatchNumber,
          status: 'Pending'
        });

        // Link withdrawal transactions to the VaultControllerTransaction
        const transactionIds = transactions.map(tx => tx.id as number);
        await this.transactionRepository.linkToVaultControllerTransaction(
          transactionIds,
          vaultControllerTx.id as number
        );

        // Update transaction statuses to VaultUpdated
        await this.transactionRepository.updateStatusBatch(transactionIds, TransactionStatus.VaultUpdated);

        logger.info('Successfully updated VaultController for batch', {
          l1BatchNumber,
          transactionCount: transactions.length,
          messageHashCount: messageHashes.length,
          vaultControllerTransactionId: vaultControllerTx.id
        });

        hasProcessedItems = true;

      } catch (error) {
        logger.error('Error processing batch for VaultController update', {
          l1BatchNumber,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return hasProcessedItems;
  }

  private computeBatchData(events: MessageWithdrawalExecuted[]): { messageHashes: string[], totalShares: bigint } {
    const messageHashes: string[] = [];
    let totalShares = 0n;

    for (const event of events) {
      // Compute messageHash using the provided formula
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint8", "address", "address", "uint256"],
        [event.vaultNonce, 2, event.l1Vault, event.receiver, event.shares]
      );
      const messageHash = ethers.keccak256(payload);
      messageHashes.push(messageHash);

      // Sum up shares
      totalShares += BigInt(event.shares);
    }

    return { messageHashes, totalShares };
  }

  private async callUpdateWithdrawalState(
    messageHashes: string[],
    l1BatchNumber: number,
    totalShares: bigint
  ): Promise<string> {
    const vaultController = new ethers.Contract(
      appConfig.vaultControllerAddress,
      VAULT_CONTROLLER_ABI,
      this.getL1Wallet()
    );

    const tx = await vaultController.updateWithdrawalState(
      messageHashes,
      l1BatchNumber,
      totalShares
    );

    logger.debug('VaultController updateWithdrawalState transaction sent', {
      txHash: tx.hash,
      l1BatchNumber
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    logger.debug('VaultController updateWithdrawalState transaction confirmed', {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status
    });

    if (receipt.status !== 1) {
      throw new Error(`VaultController transaction failed: ${tx.hash}`);
    }

    return tx.hash;
  }
}
