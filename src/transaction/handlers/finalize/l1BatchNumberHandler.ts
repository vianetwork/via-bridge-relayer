import { GlobalHandler } from '../globalHandler';
import { TransactionStatus } from '../../../entities/transactions.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import * as viaEthers from 'via-ethers';

/**
 * Handler responsible for fetching l1BatchNumber for finalized Via origin transactions
 * that don't have this value set yet.
 */
export class L1BatchNumberHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    // This handler only applies to Via origin transactions
    if (this.origin !== BridgeOrigin.Via) {
      return false;
    }

    // Get finalized transactions that are missing l1BatchNumber
    const transactions = await this.transactionRepository.getFinalizedTransactionsWithoutL1BatchNumber(
      this.origin,
      this.transactionBatchSize
    );

    if (transactions.length === 0) {
      return false;
    }

    logger.debug('Processing finalized transactions without l1BatchNumber', {
      count: transactions.length
    });

    return await this.processTransactions(transactions);
  }

  private async processTransactions(transactions: any[]): Promise<boolean> {
    let hasProcessedItems = false;

    for (const transaction of transactions) {
      try {
        logger.debug('Fetching l1BatchNumber for transaction', {
          id: transaction.id,
          bridgeTxHash: transaction.bridgeInitiatedTransactionHash
        });

        const l2Receipt = await this.l2Provider.getTransactionReceipt(
          transaction.bridgeInitiatedTransactionHash
        ) as viaEthers.types.TransactionReceipt | null;

        if (l2Receipt?.l1BatchNumber) {
          await this.transactionRepository.updateL1BatchNumber(
            transaction.id,
            l2Receipt.l1BatchNumber
          );

          logger.info('Updated l1BatchNumber for transaction', {
            id: transaction.id,
            bridgeTxHash: transaction.bridgeInitiatedTransactionHash,
            l1BatchNumber: l2Receipt.l1BatchNumber
          });

          hasProcessedItems = true;
        } else {
          logger.debug('L2 receipt does not have l1BatchNumber yet', {
            id: transaction.id,
            bridgeTxHash: transaction.bridgeInitiatedTransactionHash
          });
        }

      } catch (error) {
        logger.error('Error fetching l1BatchNumber for transaction', {
          id: transaction.id,
          bridgeTxHash: transaction.bridgeInitiatedTransactionHash,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return hasProcessedItems;
  }
}
