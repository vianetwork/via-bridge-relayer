import { ethers } from 'ethers';
import { GlobalHandler } from '../globalHandler';
import { TransactionStatus, Transaction } from '../../../entities/transactions.entity';
import { MessageWithdrawalExecuted } from '../../../entities/messageWithdrawalExecuted.entity';
import { VaultControllerTransactionStatus } from '../../../entities/vaultControllerTransaction.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import { VAULT_CONTROLLER_ABI } from '../../../contracts/VaultControler';

/**
 * Group key for batching transactions by l1BatchNumber and l1Vault address.
 * Format: "l1BatchNumber:l1VaultAddress"
 */
type BatchGroupKey = `${number}:${string}`;

/**
 * Data structure for a batch group containing transactions and their withdrawal events.
 */
interface BatchGroup {
  l1BatchNumber: number;
  l1VaultAddress: string;
  transactions: Transaction[];
  withdrawalEvents: MessageWithdrawalExecuted[];
}

/**
 * Handler responsible for calling updateWithdrawalState on VaultController
 * for finalized Via origin transactions that have l1BatchNumber set.
 *
 * Groups transactions by l1BatchNumber AND l1Vault address, then sends
 * updateWithdrawalState to the appropriate vault contract for each group.
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

    // Get all finalized transaction hashes to fetch withdrawal events
    const finalizedHashes = transactions.map(tx => tx.finalizedTransactionHash);

    // Fetch all withdrawal events upfront
    const withdrawalEvents = await this.messageWithdrawalExecutedRepository.getEventsByTransactionHashes(finalizedHashes);

    if (withdrawalEvents.length === 0) {
      logger.warn('No withdrawal events found for any transactions - check if subgraph has indexed the L1 transactions', {
        finalizedHashes
      });
      return false;
    }

    const eventsByTxHash = new Map<string, MessageWithdrawalExecuted>();
    for (const event of withdrawalEvents) {
      eventsByTxHash.set(event.transactionHash.toLowerCase(), event);
    }

    const batchGroups = this.groupByL1BatchNumberAndVault(transactions, eventsByTxHash);

    return await this.processBatches(batchGroups);
  }

  /**
   * Groups transactions by both l1BatchNumber and l1Vault address.
   * Returns a map keyed by "l1BatchNumber:l1VaultAddress".
   */
  private groupByL1BatchNumberAndVault(
    transactions: Transaction[],
    eventsByTxHash: Map<string, MessageWithdrawalExecuted>
  ): Map<BatchGroupKey, BatchGroup> {
    const groups = new Map<BatchGroupKey, BatchGroup>();

    for (const tx of transactions) {
      if (tx.l1BatchNumber === undefined || tx.l1BatchNumber === null) continue;

      const event = eventsByTxHash.get(tx.finalizedTransactionHash.toLowerCase());
      if (!event) {
        logger.warn('No withdrawal event found for transaction - skipping', {
          transactionId: tx.id,
          finalizedTransactionHash: tx.finalizedTransactionHash,
          l1BatchNumber: tx.l1BatchNumber
        });
        continue;
      }

      const l1VaultAddress = event.l1Vault.toLowerCase();
      const groupKey: BatchGroupKey = `${tx.l1BatchNumber}:${l1VaultAddress}`;

      const existing = groups.get(groupKey);
      if (existing) {
        existing.transactions.push(tx);
        existing.withdrawalEvents.push(event);
      } else {
        groups.set(groupKey, {
          l1BatchNumber: tx.l1BatchNumber,
          l1VaultAddress,
          transactions: [tx],
          withdrawalEvents: [event]
        });
      }
    }

    return groups;
  }

  private async processBatches(batchGroups: Map<BatchGroupKey, BatchGroup>): Promise<boolean> {
    let hasProcessedItems = false;

    for (const [groupKey, group] of batchGroups) {
      const { l1BatchNumber, l1VaultAddress, transactions, withdrawalEvents } = group;

      try {
        logger.debug('Processing batch for VaultController update', {
          groupKey,
          l1BatchNumber,
          l1VaultAddress,
          transactionCount: transactions.length,
          withdrawalEventsCount: withdrawalEvents.length
        });

        logger.debug('Withdrawal events for batch', {
          l1BatchNumber,
          l1VaultAddress,
          events: withdrawalEvents.map(e => ({
            id: e.id,
            txHash: e.transactionHash,
            vaultNonce: e.vaultNonce,
            shares: e.shares,
            l1Vault: e.l1Vault
          }))
        });

        const { messageHashes, totalShares } = this.computeBatchData(withdrawalEvents);

        logger.info('Calling updateWithdrawalState on VaultController', {
          l1BatchNumber,
          l1VaultAddress,
          messageHashCount: messageHashes.length,
          totalShares: totalShares.toString()
        });

        const txHash = await this.callUpdateWithdrawalState(
          l1VaultAddress,
          messageHashes,
          l1BatchNumber,
          totalShares
        );

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

        const transactionIds = transactions.map(tx => tx.id as number);
        await this.transactionRepository.linkToVaultControllerTransaction(
          transactionIds,
          vaultControllerTx.id as number
        );

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
          groupKey,
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
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint8", "address", "address", "uint256"],
        [event.vaultNonce, 2, event.l1Vault, event.receiver, event.shares]
      );
      const messageHash = ethers.keccak256(payload);
      messageHashes.push(messageHash);

      totalShares += BigInt(event.shares);
    }

    return { messageHashes, totalShares };
  }

  /**
   * Calls updateWithdrawalState on the specified vault contract.
   *
   * @param l1VaultAddress - The L1 vault contract address to call
   * @param messageHashes - Array of message hashes to update
   * @param l1BatchNumber - The L1 batch number
   * @param totalShares - Total shares for the batch
   * @returns The transaction hash
   */
  private async callUpdateWithdrawalState(
    l1VaultAddress: string,
    messageHashes: string[],
    l1BatchNumber: number,
    totalShares: bigint
  ): Promise<string> {
    const vaultController = new ethers.Contract(
      l1VaultAddress,
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
      l1BatchNumber,
      l1VaultAddress
    });

    const receipt = await tx.wait();

    logger.debug('VaultController updateWithdrawalState transaction confirmed', {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      l1VaultAddress
    });

    if (receipt.status !== 1) {
      throw new Error(`VaultController transaction failed: ${tx.hash}`);
    }

    return tx.hash;
  }
}
