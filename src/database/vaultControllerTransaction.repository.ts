import {
  VaultControllerTransaction,
  VaultControllerTransactionStatus,
} from '../entities/vaultControllerTransaction.entity';
import { RelayerBaseRepository } from './base.repository';
import { graphDataSource } from './typeorm.config';
import { appConfig } from '../utils/config';

export interface WithdrawalStateUpdatedEvent {
  id: string;
  l1Batch: number;
  exchangeRate: string;
  messageCount: number;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
}

export class VaultControllerTransactionRepository extends RelayerBaseRepository<VaultControllerTransaction> {
  constructor() {
    super(VaultControllerTransaction);
  }

  async createTransaction(data: {
    transactionHash: string;
    l1BatchNumber: number;
    totalShares: string;
    messageHashCount: number;
    status?: VaultControllerTransactionStatus;
  }): Promise<VaultControllerTransaction> {
    return await this.create({
      ...data,
      status: data.status ?? VaultControllerTransactionStatus.Pending,
    });
  }

  async findByL1BatchNumber(l1BatchNumber: number): Promise<VaultControllerTransaction | null> {
    const results = await this.findMany({ l1BatchNumber });
    return results.length > 0 ? results[0] : null;
  }

  async findByTransactionHash(transactionHash: string): Promise<VaultControllerTransaction | null> {
    const results = await this.findMany({ transactionHash });
    return results.length > 0 ? results[0] : null;
  }

  async updateStatus(
    id: number,
    status: VaultControllerTransactionStatus
  ): Promise<void> {
    await this.update(id, { status });
  }

  async getPendingTransactions(limit?: number): Promise<VaultControllerTransaction[]> {
    const repository = this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('vct')
      .where('vct.status = :status', { status: VaultControllerTransactionStatus.Pending })
      .orderBy('vct.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  async getConfirmedTransactions(limit?: number): Promise<VaultControllerTransaction[]> {
    const repository = this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('vct')
      .where('vct.status = :status', { status: VaultControllerTransactionStatus.Confirmed })
      .orderBy('vct.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Query WithdrawalStateUpdated events from the L1 subgraph
   * for the given l1BatchNumbers that are old enough (confirmed)
   * Note: This uses the graph DataSource since it queries subgraph data
   */
  async getWithdrawalStateUpdatedEvents(
    l1BatchNumbers: number[],
    maxBlockNumber: number,
    limit: number
  ): Promise<WithdrawalStateUpdatedEvent[]> {
    if (l1BatchNumbers.length === 0) return [];

    // Ensure graph DataSource is initialized
    if (!graphDataSource.isInitialized) {
      await graphDataSource.initialize();
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

    // Use graph DataSource for this query since it accesses subgraph data
    const rawResults = await graphDataSource.query(query, [l1BatchNumbers, maxBlockNumber, limit]);

    // Transform the raw results to match the interface
    return rawResults.map((row: any) => ({
      id: row.id,
      l1Batch: Number(row.l1Batch),
      exchangeRate: row.exchangeRate.toString(),
      messageCount: Number(row.messageCount),
      blockNumber: Number(row.blockNumber),
      blockTimestamp: Number(row.blockTimestamp),
      transactionHash: row.transactionHash instanceof Buffer
        ? '0x' + row.transactionHash.toString('hex')
        : row.transactionHash
    })) as WithdrawalStateUpdatedEvent[];
  }

  /**
   * Update status for multiple vault controller transactions by their l1BatchNumbers
   */
  async updateStatusByL1BatchNumbers(
    l1BatchNumbers: number[],
    status: VaultControllerTransactionStatus
  ): Promise<void> {
    if (l1BatchNumbers.length === 0) return;

    const repository = this.getRepository();
    await repository
      .createQueryBuilder()
      .update(VaultControllerTransaction)
      .set({ status })
      .where('l1BatchNumber IN (:...l1BatchNumbers)', { l1BatchNumbers })
      .execute();
  }

  async getStalePendingTransactions(
    timeoutMinutes: number,
    limit?: number
  ): Promise<VaultControllerTransaction[]> {
    const repository = this.getRepository();
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const queryBuilder = repository
      .createQueryBuilder('vct')
      .where('vct.status = :status', { status: VaultControllerTransactionStatus.Pending })
      .andWhere('vct.createdAt < :cutoffTime', { cutoffTime })
      .orderBy('vct.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }
}
