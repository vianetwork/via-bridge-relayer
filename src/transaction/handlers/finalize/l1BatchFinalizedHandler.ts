import { GlobalHandler } from '../globalHandler';
import { Transaction, TransactionStatus } from '../../../entities/transactions.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';

/**
 * Interface for the response from zks_getL1BatchDetails RPC call.
 */
interface L1BatchDetails {
  number: number;
  timestamp: number;
  l1TxCount: number;
  l2TxCount: number;
  rootHash: string | null;
  status: string;
  commitTxHash: string | null;
  committedAt: string | null;
  proveTxHash: string | null;
  provenAt: string | null;
  executeTxHash: string | null;
  executedAt: string | null;
  l1GasPrice: number;
  l2FairGasPrice: number;
  baseSystemContractsHashes: {
    bootloader: string;
    default_aa: string;
  };
}

// Zero hash constant (66 characters: 0x + 64 zeros)
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Handler responsible for checking if L1 batches have been finalized (executed) on L1.
 *
 * This handler:
 * 1. Gets finalized Via transactions that have l1BatchNumber set
 * 2. For each unique l1BatchNumber, calls zks_getL1BatchDetails on L2
 * 3. Checks the executeTxHash field to determine if the batch has been executed on L1
 * 4. Updates transactions to L1BatchFinalized status when the batch is finalized
 *
 * The executeTxHash field semantics:
 * - null or 0x0000...0000 (zero hash): Batch NOT finalized on L1, skip
 * - Any non-null, non-zero hash: Batch IS finalized on L1, mark as ready
 */
export class L1BatchFinalizedHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    // This handler only applies to Via origin transactions
    if (this.origin !== BridgeOrigin.Via) {
      return false;
    }

    // Get finalized transactions that have l1BatchNumber set
    const transactions = await this.transactionRepository.getFinalizedTransactionsForL1BatchCheck(
      this.origin,
      this.transactionBatchSize
    );

    if (transactions.length === 0) {
      return false;
    }

    logger.debug('Checking L1 batch finalization status for transactions', {
      count: transactions.length
    });

    // Group transactions by l1BatchNumber for efficient RPC calls
    const transactionsByBatch = this.groupByL1BatchNumber(transactions);

    return await this.processL1Batches(transactionsByBatch);
  }

  /**
   * Groups transactions by l1BatchNumber.
   */
  private groupByL1BatchNumber(transactions: Transaction[]): Map<number, Transaction[]> {
    const groups = new Map<number, Transaction[]>();

    for (const tx of transactions) {
      if (tx.l1BatchNumber === undefined || tx.l1BatchNumber === null) continue;

      const existing = groups.get(tx.l1BatchNumber);
      if (existing) {
        existing.push(tx);
      } else {
        groups.set(tx.l1BatchNumber, [tx]);
      }
    }

    return groups;
  }

  /**
   * Process each unique l1BatchNumber and check if it's finalized on L1.
   */
  private async processL1Batches(
    transactionsByBatch: Map<number, Transaction[]>
  ): Promise<boolean> {
    let hasProcessedItems = false;

    for (const [l1BatchNumber, transactions] of transactionsByBatch) {
      try {
        logger.debug('Checking L1 batch finalization', {
          l1BatchNumber,
          transactionCount: transactions.length
        });

        const isFinalized = await this.checkL1BatchFinalized(l1BatchNumber);

        if (isFinalized) {
          // Update all transactions with this batch number to L1BatchFinalized status
          await this.transactionRepository.updateStatusByL1BatchNumber(
            l1BatchNumber,
            this.origin,
            TransactionStatus.L1BatchFinalized
          );

          logger.info('L1 batch finalized - updated transactions', {
            l1BatchNumber,
            transactionCount: transactions.length,
            transactionIds: transactions.map(tx => tx.id)
          });

          hasProcessedItems = true;
        } else {
          logger.debug('L1 batch not yet finalized', {
            l1BatchNumber
          });
        }

      } catch (error) {
        logger.error('Error checking L1 batch finalization', {
          l1BatchNumber,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return hasProcessedItems;
  }

  /**
   * Check if an L1 batch has been finalized (executed) on L1.
   * Uses the zks_getL1BatchDetails RPC method on L2.
   *
   * @param l1BatchNumber - The L1 batch number to check
   * @returns true if the batch is finalized, false otherwise
   */
  private async checkL1BatchFinalized(l1BatchNumber: number): Promise<boolean> {
    try {
      // Call zks_getL1BatchDetails via the L2 provider's raw JSON-RPC
      const batchDetails = await this.l2Provider.send('zks_getL1BatchDetails', [l1BatchNumber]) as L1BatchDetails | null;

      if (!batchDetails) {
        logger.warn('No batch details returned for L1 batch', {
          l1BatchNumber
        });
        return false;
      }

      const { executeTxHash } = batchDetails;

      logger.debug('L1 batch details retrieved', {
        l1BatchNumber,
        executeTxHash,
        status: batchDetails.status,
        executedAt: batchDetails.executedAt
      });

      // Check if executeTxHash indicates finalization
      // Per requirements:
      // - null or 0x0000...0000 (zero hash): NOT finalized
      // - Any other non-null hash (including 0x1111...1111): IS finalized
      if (!executeTxHash || executeTxHash === ZERO_HASH) {
        return false;
      }

      // Batch is finalized if executeTxHash is a real transaction hash (not zero hash)
      return true;

    } catch (error) {
      logger.error('Error calling zks_getL1BatchDetails', {
        l1BatchNumber,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
