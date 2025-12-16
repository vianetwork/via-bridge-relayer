/**
 * GraphQL response types matching The Graph schema for via-bridge subgraph
 */

// Raw GraphQL response types (strings from The Graph API)
export interface GraphQLMessageSent {
  id: string;
  payload: string; // 0x-prefixed hex string
  blockNumber: string; // BigInt as string
  blockTimestamp: string; // BigInt as string
  transactionHash: string; // 0x-prefixed hex string
}

export interface GraphQLDepositMessageSent {
  id: string;
  vaultNonce: string; // BigInt as string
  l1Vault: string; // 0x-prefixed hex string
  l2Vault: string; // 0x-prefixed hex string
  receiver: string; // 0x-prefixed hex string
  shares: string; // BigInt as string
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface GraphQLMessageWithdrawalExecuted {
  id: string;
  vaultNonce: string; // BigInt as string
  l1Vault: string; // 0x-prefixed hex string
  receiver: string; // 0x-prefixed hex string
  shares: string; // BigInt as string
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface GraphQLWithdrawalStateUpdated {
  id: string;
  l1Batch: string;
  exchangeRate: string;
  messageCount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

// Query response wrappers
export interface MessageSentQueryResponse {
  messageSents: GraphQLMessageSent[];
}

export interface DepositMessageSentQueryResponse {
  depositMessageSents: GraphQLDepositMessageSent[];
}

export interface MessageWithdrawalExecutedQueryResponse {
  messageWithdrawalExecuteds: GraphQLMessageWithdrawalExecuted[];
}

export interface WithdrawalStateUpdatedQueryResponse {
  withdrawalStateUpdateds: GraphQLWithdrawalStateUpdated[];
}

// Transformed types (matching existing entity types)
export interface MessageSentEvent {
  id: string;
  payload: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
}

export interface MessageWithdrawalExecutedEvent {
  id: string;
  vaultNonce: number;
  l1Vault: string;
  receiver: string;
  shares: number;
  blockNumber: number;
  transactionHash: string;
}

export interface DepositMessageSentEvent {
  id: string;
  vaultNonce: number;
  l1Vault: string;
  l2Vault: string;
  receiver: string;
  shares: number;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
}

export interface WithdrawalStateUpdatedEvent {
  id: string;
  l1Batch: number;
  exchangeRate: number;
  messageCount: number;
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
}
