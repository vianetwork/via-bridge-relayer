import { IWithdrawalStateUpdatedRepository } from '../database/interfaces';
import { GraphQLClient } from './graphqlClient';
import { WITHDRAWAL_STATE_UPDATED_BY_BATCHES_QUERY } from './queries';
import {
  WithdrawalStateUpdatedQueryResponse,
  GraphQLWithdrawalStateUpdated,
  WithdrawalStateUpdatedEvent,
} from './types';
import logger from '../utils/logger';

/**
 * GraphQL-based repository for WithdrawalStateUpdated events.
 * Queries The Graph API instead of direct PostgreSQL access.
 */
export class WithdrawalStateUpdatedGraphQLRepository
  implements IWithdrawalStateUpdatedRepository
{
  private client: GraphQLClient;
  private connected: boolean = false;

  constructor(client: GraphQLClient) {
    this.client = client;
  }

  async connect(): Promise<void> {
    this.connected = true;
    logger.info(
      `WithdrawalStateUpdatedGraphQLRepository connected to: ${this.client.getEndpoint()}`
    );
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
      throw new Error('GraphQL repository not connected');
    }

    if (l1BatchNumbers.length === 0) {
      return [];
    }

    // Convert batch numbers to strings for GraphQL BigInt type
    const batchesAsStrings = l1BatchNumbers.map((n) => n.toString());

    const response =
      await this.client.query<WithdrawalStateUpdatedQueryResponse>(
        WITHDRAWAL_STATE_UPDATED_BY_BATCHES_QUERY,
        {
          batches: batchesAsStrings,
          maxBlock: maxBlockNumber.toString(),
          limit,
        }
      );

    return response.withdrawalStateUpdateds.map((event) =>
      this.transformToEvent(event)
    );
  }

  /**
   * Transform GraphQL response to WithdrawalStateUpdatedEvent format
   */
  private transformToEvent(
    event: GraphQLWithdrawalStateUpdated
  ): WithdrawalStateUpdatedEvent {
    return {
      id: event.id,
      l1Batch: Number(event.l1Batch),
      exchangeRate: Number(event.exchangeRate),
      messageCount: Number(event.messageCount),
      blockNumber: Number(event.blockNumber),
      blockTimestamp: Number(event.blockTimestamp),
      transactionHash: event.transactionHash,
    };
  }
}
