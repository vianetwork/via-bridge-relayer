import { DepositExecuted } from '../../entities/depositExecuted.entity';
import { MessageWithdrawalExecuted } from '../../entities/messageWithdrawalExecuted.entity';

/**
 * Interface for message withdrawal executed event repository.
 * Implemented by both TypeORM (MessageWithdrawalExecutedRepository)
 * and GraphQL (MessageWithdrawalExecutedGraphQLRepository) implementations.
 */
export interface IMessageWithdrawalExecutedRepository {
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
   * Find a message withdrawal executed event by vault nonce
   * @param vaultNonce - The vault nonce to search for
   */
  findByNonce(vaultNonce: number): Promise<MessageWithdrawalExecuted | null>;

  /**
   * Get message withdrawal executed events within a block range
   * @param lastBlock - Start block number (exclusive for some implementations)
   * @param safeBlock - End block number (inclusive)
   * @param limit - Maximum number of events to return
   */
  getEventsSinceBlock(
    lastBlock: number,
    safeBlock: number,
    limit: number
  ): Promise<MessageWithdrawalExecuted[]>;

  /**
   * Get message withdrawal executed events by transaction hashes
   * @param transactionHashes - Array of transaction hashes to search for
   */
  getEventsByTransactionHashes(
    transactionHashes: string[]
  ): Promise<MessageWithdrawalExecuted[]>;
}

/**
 * Interface for deposit executed event repository.
 * Used for L2 deposit execution events.
 */
export interface IDepositExecutedRepository {
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
   * Find a deposit executed event by nonce
   * @param nonce - The nonce to search for
   */
  findByNonce(nonce: number): Promise<DepositExecuted | null>;

  /**
   * Get deposit executed events within a block range
   * @param lastBlock - Start block number (exclusive)
   * @param safeBlock - End block number (inclusive)
   * @param limit - Maximum number of events to return
   */
  getEventsSinceBlock(
    lastBlock: number,
    safeBlock: number,
    limit: number
  ): Promise<DepositExecuted[]>;
}
