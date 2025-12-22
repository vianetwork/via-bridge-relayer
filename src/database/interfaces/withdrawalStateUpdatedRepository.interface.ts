import { WithdrawalStateUpdatedEvent } from '../../graphql/types';

/**
 * Interface for withdrawal state updated event repository.
 * Implemented by both TypeORM (WithdrawalStateUpdatedRepository)
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
   * that are confirmed (block number <= maxBlockNumber)
   * @param l1BatchNumbers - Array of L1 batch numbers to search for
   * @param maxBlockNumber - Maximum block number (for confirmation filtering)
   * @param limit - Maximum number of events to return
   */
  getWithdrawalStateUpdatedEvents(
    l1BatchNumbers: number[],
    maxBlockNumber: number,
    limit: number
  ): Promise<WithdrawalStateUpdatedEvent[]>;
}
