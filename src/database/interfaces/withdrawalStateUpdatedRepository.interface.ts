import { WithdrawalStateUpdatedEvent } from '../vaultControllerTransaction.repository';

/**
 * Interface for WithdrawalStateUpdated event repository.
 * Implemented by both TypeORM (VaultControllerTransactionRepository)
 * and GraphQL (WithdrawalStateUpdatedGraphQLRepository) implementations.
 */
export interface IWithdrawalStateUpdatedRepository {
  /**
   * Connect to the data source
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the data source
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected to the data source
   */
  isDbConnected(): boolean;

  /**
   * Get WithdrawalStateUpdated events for the given l1BatchNumbers
   * that have been confirmed (block number <= maxBlockNumber)
   * @param l1BatchNumbers - Array of L1 batch numbers to query
   * @param maxBlockNumber - Maximum block number (for confirmation filtering)
   * @param limit - Maximum number of events to return
   */
  getWithdrawalStateUpdatedEvents(
    l1BatchNumbers: number[],
    maxBlockNumber: number,
    limit: number
  ): Promise<WithdrawalStateUpdatedEvent[]>;
}
