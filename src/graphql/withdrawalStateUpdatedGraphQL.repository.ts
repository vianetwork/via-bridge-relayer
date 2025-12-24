import { IWithdrawalStateUpdatedRepository } from '../database/interfaces';
import { WithdrawalStateUpdatedEvent } from '../database/vaultControllerTransaction.repository';
import { GraphQLClient } from './graphqlClient';
import { WITHDRAWAL_STATE_UPDATED_BY_L1_BATCH_QUERY } from './queries';
import {
  WithdrawalStateUpdatedQueryResponse,
  GraphQLWithdrawalStateUpdated,
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
    const l1Batches = l1BatchNumbers.map((batch) => batch.toString());

    const response = await this.client.query<WithdrawalStateUpdatedQueryResponse>(
      WITHDRAWAL_STATE_UPDATED_BY_L1_BATCH_QUERY,
      {
        l1Batches,
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
      exchangeRate: event.exchangeRate,
      messageCount: Number(event.messageCount),
      blockNumber: Number(event.blockNumber),
      blockTimestamp: Number(event.blockTimestamp),
      transactionHash: event.transactionHash,
    };
  }
}
