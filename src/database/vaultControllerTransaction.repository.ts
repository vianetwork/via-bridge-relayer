import {
  VaultControllerTransaction,
  VaultControllerTransactionStatus,
} from '../entities/vaultControllerTransaction.entity';
import { RelayerBaseRepository } from './base.repository';

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
