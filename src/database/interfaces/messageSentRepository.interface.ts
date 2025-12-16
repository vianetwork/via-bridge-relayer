import { L1MessageSent } from '../../entities/l1MessageSent.entity';
import { L2MessageSent } from '../../entities/l2MessageSent.entity';

/**
 * Interface for message sent event repositories.
 * Implemented by both TypeORM (L1MessageSentRepository, L2MessageSentRepository)
 * and GraphQL (L1MessageSentGraphQLRepository) implementations.
 */
export interface IMessageSentRepository<T = L1MessageSent | L2MessageSent> {
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
   * Get message sent events within a block range
   * @param lastBlock - Start block number (inclusive)
   * @param safeBlock - End block number (inclusive)
   * @param limit - Maximum number of events to return
   */
  getEventsSinceBlock(
    lastBlock: number,
    safeBlock: number,
    limit?: number
  ): Promise<T[]>;
}

export type IL1MessageSentRepository = IMessageSentRepository<L1MessageSent>;
export type IL2MessageSentRepository = IMessageSentRepository<L2MessageSent>;
