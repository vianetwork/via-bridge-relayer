import { L1MessageSent } from '../entities/l1MessageSent.entity';
import { IL1MessageSentRepository } from '../database/interfaces';
import { GraphQLClient } from './graphqlClient';
import { MESSAGE_SENT_QUERY } from './queries';
import { MessageSentQueryResponse, GraphQLMessageSent } from './types';
import logger from '../utils/logger';

/**
 * GraphQL-based repository for L1 MessageSent events.
 * Queries The Graph API instead of direct PostgreSQL access.
 */
export class L1MessageSentGraphQLRepository implements IL1MessageSentRepository {
  private client: GraphQLClient;
  private connected: boolean = false;

  constructor(client: GraphQLClient) {
    this.client = client;
  }

  async connect(): Promise<void> {
    // GraphQL client is ready to use immediately
    // We could add a health check query here if needed
    this.connected = true;
    logger.info(
      `L1MessageSentGraphQLRepository connected to: ${this.client.getEndpoint()}`
    );
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isDbConnected(): boolean {
    return this.connected;
  }

  async getEventsSinceBlock(
    lastBlock: number,
    safeBlock: number,
    limit: number = 100
  ): Promise<L1MessageSent[]> {
    if (!this.connected) {
      throw new Error('GraphQL repository not connected');
    }

    const response = await this.client.query<MessageSentQueryResponse>(
      MESSAGE_SENT_QUERY,
      {
        lastBlock: lastBlock.toString(),
        safeBlock: safeBlock.toString(),
        limit,
      }
    );

    return response.messageSents.map((event) => this.transformToEntity(event));
  }

  /**
   * Transform GraphQL response to L1MessageSent entity format
   */
  private transformToEntity(event: GraphQLMessageSent): L1MessageSent {
    // Create a plain object that matches the entity structure
    // The Graph returns hex strings already 0x-prefixed
    const entity = {
      id: event.id,
      payload: event.payload,
      blockNumber: Number(event.blockNumber),
      blockTimestamp: Number(event.blockTimestamp),
      transactionHash: event.transactionHash,
    } as L1MessageSent;

    return entity;
  }
}
