import { GlobalHandler } from '../globalHandler';
import { TransactionStatus } from '../../../entities/transactions.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import { appConfig } from '../../../utils/config';
import { DepositExecuted } from '../../../entities/depositExecuted.entity';
import { MessageWithdrawalExecuted } from '../../../entities/messageWithdrawalExecuted.entity';

export class BridgeFinalizeHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    const lastFinalizedBlockFromDb = await this.transactionRepository.getLastFinalizedBlock(this.origin);
    const lastFinalizedBlock = Math.max(lastFinalizedBlockFromDb, this.destinationStartingBlock);
    const currentBlock = await this.destinationProvider.getBlockNumber();
    const safeBlock = currentBlock - this.destinationBlockConfirmations;

    logger.debug('Polling new bridge finalized events from DB', {
      origin: this.origin,
      lastFinalizedBlockFromDb,
      destinationStartingBlock: this.destinationStartingBlock,
      lastFinalizedBlock,
      currentBlock,
      safeBlock
    });

    // Fetch executed events from Subgraph
    const executedEvents = await this.getNextBridgeExecutedEvents(lastFinalizedBlock, safeBlock);

    if (executedEvents.length > 0) {
      // Process events and match with pending transactions
      return await this.processNewBridgeExecutedEvents(executedEvents);
    }

    return false;
  }

  private async getNextBridgeExecutedEvents(lastBlock: number, safeBlock: number): Promise<Array<DepositExecuted | MessageWithdrawalExecuted>> {
    const limit = this.transactionBatchSize;

    if (this.origin === BridgeOrigin.Ethereum) {
      return await this.depositExecutedRepository.getEventsSinceBlock(lastBlock, safeBlock, limit);
    } else {
      return await this.messageWithdrawalExecutedRepository.getEventsSinceBlock(lastBlock, safeBlock, limit);
    }
  }

  private async processNewBridgeExecutedEvents(events: any[]): Promise<boolean> {
    let hasProcessedItems = false;

    for (const event of events) {
      try {
        const transactionHash = event.transactionHash;
        logger.debug('Processing execution event', { eventId: event.id, transactionHash });

        const transaction = await this.transactionRepository.getTransactionByFinalizedHash(transactionHash);

        if (transaction && transaction.status === TransactionStatus.Pending) {
          await this.transactionRepository.updateStatus(
            transaction.id,
            TransactionStatus.Finalized,
            Number(event.blockNumber)
          );
          logger.info('Transaction finalized via subgraph event', {
            bridgeTxHash: transaction.bridgeInitiatedTransactionHash,
            finalizedTxHash: transactionHash,
            finalizedEventId: event.id
          });
          hasProcessedItems = true;
        } else {
          logger.debug('No pending transaction found for finalized hash', { transactionHash });
        }

      } catch (error) {
        logger.error('Error processing execution event', { eventId: event.id, error });
      }
    }

    return hasProcessedItems;
  }
}