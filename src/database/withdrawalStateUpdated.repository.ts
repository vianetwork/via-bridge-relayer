import { IWithdrawalStateUpdatedRepository } from './interfaces';
import { WithdrawalStateUpdatedEvent } from '../graphql/types';
import { graphDataSource } from './typeorm.config';
import { appConfig } from '../utils/config';
import logger from '../utils/logger';

/**
 * TypeORM-based repository for WithdrawalStateUpdated events.
 * Queries the graph PostgreSQL database directly.
 */
export class WithdrawalStateUpdatedRepository
  implements IWithdrawalStateUpdatedRepository
{
  private connected: boolean = false;

  async connect(): Promise<void> {
    // Ensure graph DataSource is initialized
    if (!graphDataSource.isInitialized) {
      await graphDataSource.initialize();
    }
    this.connected = true;
    logger.info('WithdrawalStateUpdatedRepository connected to graph database');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isDbConnected(): boolean {
    return this.connected;
  }

  /**
   * Get WithdrawalStateUpdated events for the given l1BatchNumbers
   * that are confirmed (block number <= maxBlockNumber)
   */
  async getWithdrawalStateUpdatedEvents(
    l1BatchNumbers: number[],
    maxBlockNumber: number,
    limit: number
  ): Promise<WithdrawalStateUpdatedEvent[]> {
    if (!this.connected) {
      throw new Error('Repository not connected');
    }

    if (l1BatchNumbers.length === 0) {
      return [];
    }

    const schema = appConfig.l1GraphSchema;

    // Build the query to get WithdrawalStateUpdated events from subgraph
    const query = `
      SELECT
        id,
        l_1_batch as "l1Batch",
        exchange_rate as "exchangeRate",
        message_count as "messageCount",
        block_number as "blockNumber",
        block_timestamp as "blockTimestamp",
        transaction_hash as "transactionHash"
      FROM "${schema}"."withdrawal_state_updated"
      WHERE l_1_batch = ANY($1)
        AND block_number <= $2
      ORDER BY block_number ASC
      LIMIT $3
    `;

    const rawResults = await graphDataSource.query(query, [
      l1BatchNumbers,
      maxBlockNumber,
      limit,
    ]);

    // Transform the raw results to match the interface
    return rawResults.map(
      (row: any): WithdrawalStateUpdatedEvent => ({
        id: row.id,
        l1Batch: Number(row.l1Batch),
        exchangeRate: Number(row.exchangeRate),
        messageCount: Number(row.messageCount),
        blockNumber: Number(row.blockNumber),
        blockTimestamp: Number(row.blockTimestamp),
        transactionHash:
          row.transactionHash instanceof Buffer
            ? '0x' + row.transactionHash.toString('hex')
            : row.transactionHash,
      })
    );
  }
}
