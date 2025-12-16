import { MessageWithdrawalExecuted } from '../entities/messageWithdrawalExecuted.entity';
import { IMessageWithdrawalExecutedRepository } from '../database/interfaces';
import { GraphQLClient } from './graphqlClient';
import {
  MESSAGE_WITHDRAWAL_EXECUTED_QUERY,
  MESSAGE_WITHDRAWAL_EXECUTED_BY_HASHES_QUERY,
} from './queries';
import {
  MessageWithdrawalExecutedQueryResponse,
  GraphQLMessageWithdrawalExecuted,
} from './types';
import logger from '../utils/logger';

/**
 * GraphQL-based repository for MessageWithdrawalExecuted events.
 * Queries The Graph API instead of direct PostgreSQL access.
 */
export class MessageWithdrawalExecutedGraphQLRepository
  implements IMessageWithdrawalExecutedRepository
{
  private client: GraphQLClient;
  private connected: boolean = false;

  constructor(client: GraphQLClient) {
    this.client = client;
  }

  async connect(): Promise<void> {
    this.connected = true;
    logger.info(
      `MessageWithdrawalExecutedGraphQLRepository connected to: ${this.client.getEndpoint()}`
    );
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isDbConnected(): boolean {
    return this.connected;
  }

  async findByNonce(
    vaultNonce: number
  ): Promise<MessageWithdrawalExecuted | null> {
    if (!this.connected) {
      throw new Error('GraphQL repository not connected');
    }

    // Query for a specific nonce using a filtered query
    const query = `
      query MessageWithdrawalExecutedByNonce($vaultNonce: BigInt!) {
        messageWithdrawalExecuteds(
          where: { vaultNonce: $vaultNonce }
          first: 1
        ) {
          id
          vaultNonce
          l1Vault
          receiver
          shares
          blockNumber
          blockTimestamp
          transactionHash
        }
      }
    `;

    const response = await this.client.query<MessageWithdrawalExecutedQueryResponse>(
      query,
      { vaultNonce: vaultNonce.toString() }
    );

    if (response.messageWithdrawalExecuteds.length === 0) {
      return null;
    }

    return this.transformToEntity(response.messageWithdrawalExecuteds[0]);
  }

  async getEventsSinceBlock(
    lastBlock: number,
    safeBlock: number,
    limit: number
  ): Promise<MessageWithdrawalExecuted[]> {
    if (!this.connected) {
      throw new Error('GraphQL repository not connected');
    }

    // Note: The TypeORM implementation uses blockNumber > lastBlock (exclusive)
    // We adjust the query to match this behavior by using blockNumber_gt
    const query = `
      query MessageWithdrawalExecuteds($lastBlock: BigInt!, $safeBlock: BigInt!, $limit: Int!) {
        messageWithdrawalExecuteds(
          where: { blockNumber_gt: $lastBlock, blockNumber_lte: $safeBlock }
          orderBy: blockNumber
          orderDirection: asc
          first: $limit
        ) {
          id
          vaultNonce
          l1Vault
          receiver
          shares
          blockNumber
          blockTimestamp
          transactionHash
        }
      }
    `;

    const response = await this.client.query<MessageWithdrawalExecutedQueryResponse>(
      query,
      {
        lastBlock: lastBlock.toString(),
        safeBlock: safeBlock.toString(),
        limit,
      }
    );

    return response.messageWithdrawalExecuteds.map((event) =>
      this.transformToEntity(event)
    );
  }

  async getEventsByTransactionHashes(
    transactionHashes: string[]
  ): Promise<MessageWithdrawalExecuted[]> {
    if (!this.connected) {
      throw new Error('GraphQL repository not connected');
    }

    if (transactionHashes.length === 0) {
      return [];
    }

    // Ensure all hashes are properly formatted (0x-prefixed lowercase)
    const formattedHashes = transactionHashes.map((hash) => {
      const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
      return cleanHash.toLowerCase();
    });

    const response = await this.client.query<MessageWithdrawalExecutedQueryResponse>(
      MESSAGE_WITHDRAWAL_EXECUTED_BY_HASHES_QUERY,
      { hashes: formattedHashes }
    );

    return response.messageWithdrawalExecuteds.map((event) =>
      this.transformToEntity(event)
    );
  }

  /**
   * Transform GraphQL response to MessageWithdrawalExecuted entity format
   */
  private transformToEntity(
    event: GraphQLMessageWithdrawalExecuted
  ): MessageWithdrawalExecuted {
    const entity = {
      id: event.id,
      vaultNonce: Number(event.vaultNonce),
      l1Vault: event.l1Vault,
      receiver: event.receiver,
      shares: Number(event.shares),
      blockNumber: Number(event.blockNumber),
      transactionHash: event.transactionHash,
    } as MessageWithdrawalExecuted;

    return entity;
  }
}
