/**
 * GraphQL query strings for The Graph via-bridge subgraph
 */

export const MESSAGE_SENT_QUERY = `
  query MessageSents($lastBlock: BigInt!, $safeBlock: BigInt!, $limit: Int!) {
    messageSents(
      where: { blockNumber_gte: $lastBlock, blockNumber_lte: $safeBlock }
      orderBy: blockNumber
      orderDirection: asc
      first: $limit
    ) {
      id
      payload
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const DEPOSIT_MESSAGE_SENT_QUERY = `
  query DepositMessageSents($lastBlock: BigInt!, $safeBlock: BigInt!, $limit: Int!) {
    depositMessageSents(
      where: { blockNumber_gte: $lastBlock, blockNumber_lte: $safeBlock }
      orderBy: blockNumber
      orderDirection: asc
      first: $limit
    ) {
      id
      vaultNonce
      l1Vault
      l2Vault
      receiver
      shares
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const MESSAGE_WITHDRAWAL_EXECUTED_QUERY = `
  query MessageWithdrawalExecuteds($lastBlock: BigInt!, $safeBlock: BigInt!, $limit: Int!) {
    messageWithdrawalExecuteds(
      where: { blockNumber_gte: $lastBlock, blockNumber_lte: $safeBlock }
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

export const MESSAGE_WITHDRAWAL_EXECUTED_BY_HASHES_QUERY = `
  query MessageWithdrawalExecutedsByHashes($hashes: [Bytes!]!) {
    messageWithdrawalExecuteds(
      where: { transactionHash_in: $hashes }
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

export const WITHDRAWAL_STATE_UPDATED_QUERY = `
  query WithdrawalStateUpdateds($lastBlock: BigInt!, $safeBlock: BigInt!, $limit: Int!) {
    withdrawalStateUpdateds(
      where: { blockNumber_gte: $lastBlock, blockNumber_lte: $safeBlock }
      orderBy: blockNumber
      orderDirection: asc
      first: $limit
    ) {
      id
      l1Batch
      exchangeRate
      messageCount
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;
