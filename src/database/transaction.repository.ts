import {
  Transaction,
  TransactionStatus,
} from '../entities/transactions.entity';
import { BridgeOrigin } from '../types/types';
import { RelayerBaseRepository } from './base.repository';
import logger from '../utils/logger';
import { log } from '../utils/logger';

export class TransactionRepository extends RelayerBaseRepository<Transaction> {
  constructor() {
    super(Transaction);
  }

  public async create(data: {
    bridgeInitiatedTransactionHash: string;
    finalizedTransactionHash: string;
    status: number;
    origin: number;
    eventType: string;
    subgraphId: string;
    originBlockNumber: number;
    payload: string;
  }): Promise<Transaction> {
    const repository = this.getRepository();
    const transaction = repository.create(data);
    return await repository.save(transaction);
  }

  // createTransaction method removed as it depended on BridgeInitiatedEvent
  // Use create() directly with Partial<Transaction>

  async updateStatus(
    transactionId: number,
    status: TransactionStatus,
    blockNumber?: number,
    l1BatchNumber?: number
  ): Promise<void> {
    const updateData: { status: TransactionStatus; blockNumber?: number; l1BatchNumber?: number } = { status, blockNumber };
    if (l1BatchNumber !== undefined) {
      updateData.l1BatchNumber = l1BatchNumber;
    }
    await this.update(transactionId, updateData);
  }

  async getTransactionsByStatus(
    status: TransactionStatus,
    origin: BridgeOrigin,
    limit?: number,
    toBlockNumber?: number
  ): Promise<Transaction[]> {
    const repository = this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('transaction')
      .where('transaction.status = :status', { status })
      .andWhere('transaction.origin = :origin', { origin })
      .orderBy('transaction.createdAt', 'ASC');

    if (toBlockNumber !== undefined) {
      queryBuilder.andWhere(
        '(transaction.blockNumber <= :toBlockNumber OR transaction.blockNumber IS NULL)',
        { toBlockNumber }
      );
    }

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  async getFailedTransactionsWithNoRefunds(
    origin: BridgeOrigin,
    limit?: number
  ): Promise<Transaction[]> {
    const repository = this.getRepository();
    return await repository
      .createQueryBuilder('transaction')
      .leftJoin(
        'refund_transaction_relations',
        'refundRel',
        'refundRel.transaction_id = transaction.id'
      )
      .where('transaction.status = :status', {
        status: TransactionStatus.Failed,
      })
      .andWhere('transaction.origin = :origin', { origin })
      .andWhere('refundRel.transaction_id IS NULL')
      .orderBy('transaction.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  async findByBridgeInitiatedTransactionHash(
    bridgeInitiatedTransactionHash: string
  ): Promise<Transaction | null> {
    const transactions = await this.findMany({
      bridgeInitiatedTransactionHash,
    });
    return transactions.length > 0 ? transactions[0] : null;
  }

  async findBySubgraphId(subgraphId: string): Promise<Transaction | null> {
    const transactions = await this.findMany({ subgraphId });
    return transactions.length > 0 ? transactions[0] : null;
  }

  async getLastProcessedBlock(origin: BridgeOrigin): Promise<number> {
    const repository = this.getRepository();
    const result = await repository
      .createQueryBuilder('transaction')
      .select('MAX(transaction.originBlockNumber)', 'maxBlock')
      .where('transaction.origin = :origin', { origin })
      .getRawOne();

    return result && result.maxBlock ? Number(result.maxBlock) : 0;
  }

  async getTransactionByFinalizedHash(
    finalizedTransactionHash: string
  ): Promise<Transaction | null> {
    const transactions = await this.findMany({ finalizedTransactionHash });
    return transactions.length > 0 ? transactions[0] : null;
  }

  async getStatistics(): Promise<{
    totalTransactions: number;
    pendingTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    averageProcessingTime: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const [
        totalTransactions,
        pendingTransactions,
        completedTransactions,
        failedTransactions,
        avgProcessingTimeResult,
      ] = await Promise.all([
        this.repository.count(),
        this.repository.count({ where: { status: TransactionStatus.Pending } }),
        this.repository.count({
          where: { status: TransactionStatus.Finalized },
        }),
        this.repository.count({ where: { status: TransactionStatus.Failed } }),
        this.repository.query(`
          SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avgProcessingTime 
          FROM transactions 
          WHERE status = 'COMPLETED' AND updated_at IS NOT NULL
        `),
      ]);

      return {
        totalTransactions,
        pendingTransactions,
        completedTransactions,
        failedTransactions,
        averageProcessingTime:
          avgProcessingTimeResult[0]?.avgProcessingTime || 0,
      };
    } catch (error) {
      log.error('❌ Error fetching transaction statistics:', error);
      throw error;
    }
  }

  async getNextTransactionBatch(
    filterConditions: any,
    limit: number = 100
  ): Promise<Transaction[]> {
    return await this.findMany(filterConditions, undefined, limit);
  }

  async getLastFinalizedBlock(origin: BridgeOrigin): Promise<number> {
    const repository = this.getRepository();
    const result = await repository
      .createQueryBuilder('transaction')
      .select('MAX(transaction.blockNumber)', 'maxBlock')
      .where('transaction.origin = :origin', { origin })
      .andWhere('transaction.status = :status', { status: TransactionStatus.Finalized })
      .getRawOne();

    return result && result.maxBlock ? Number(result.maxBlock) : 0;
  }

  async getFinalizedTransactionsWithoutL1BatchNumber(
    origin: BridgeOrigin,
    limit?: number
  ): Promise<Transaction[]> {
    const repository = this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('transaction')
      .where('transaction.status = :status', { status: TransactionStatus.Finalized })
      .andWhere('transaction.origin = :origin', { origin })
      .andWhere('transaction.l1BatchNumber IS NULL')
      .orderBy('transaction.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  async updateL1BatchNumber(
    transactionId: number,
    l1BatchNumber: number
  ): Promise<void> {
    await this.update(transactionId, { l1BatchNumber });
  }

  async getFinalizedTransactionsWithL1BatchNumber(
    origin: BridgeOrigin,
    limit?: number
  ): Promise<Transaction[]> {
    const repository = this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('transaction')
      .where('transaction.status = :status', { status: TransactionStatus.Finalized })
      .andWhere('transaction.origin = :origin', { origin })
      .andWhere('transaction.l1BatchNumber IS NOT NULL')
      .orderBy('transaction.l1BatchNumber', 'ASC')
      .addOrderBy('transaction.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }

  async updateStatusBatch(
    transactionIds: number[],
    status: TransactionStatus
  ): Promise<void> {
    if (transactionIds.length === 0) return;
    
    const repository = this.getRepository();
    await repository
      .createQueryBuilder()
      .update(Transaction)
      .set({ status })
      .whereInIds(transactionIds)
      .execute();
  }

  async linkToVaultControllerTransaction(
    transactionIds: number[],
    vaultControllerTransactionId: number
  ): Promise<void> {
    if (transactionIds.length === 0) return;

    const repository = this.getRepository();
    await repository
      .createQueryBuilder()
      .update(Transaction)
      .set({ vaultControllerTransaction: { id: vaultControllerTransactionId } } as any)
      .whereInIds(transactionIds)
      .execute();
  }

  async getStalePendingTransactions(
    origin: BridgeOrigin,
    timeoutMinutes: number,
    limit?: number
  ): Promise<Transaction[]> {
    const repository = this.getRepository();
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const queryBuilder = repository
      .createQueryBuilder('transaction')
      .where('transaction.status = :status', { status: TransactionStatus.Pending })
      .andWhere('transaction.origin = :origin', { origin })
      .andWhere('transaction.createdAt < :cutoffTime', { cutoffTime })
      .orderBy('transaction.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return await queryBuilder.getMany();
  }
}
