import { ethers } from 'ethers';

export enum BridgeOrigin {
  Ethereum = 0,
  Via = 1,
}

export enum BridgeInitiatedEventStatus {
  New = 0,
  Processed = 1,
  Finalized = 2,
  Failed = 3,
}

export interface NetworkInfo {
  network: ethers.Network;
  blockNumber: number;
}

export interface ContractAddresses {
  ethereumBridge: string;
  viaBridge: string;
}

export interface BridgeInitiatedArguments {
  ethTokenAddress: string;
  viaTokenAddress?: string;
  amount: bigint;
  from: string;
  to: string;
  value: bigint;
}

export interface BridgeInitiatedEvent {
  eventName: string;
  args: BridgeInitiatedArguments;
  address: string;
  blockNumber: bigint;
  transactionHash: string;
  origin: BridgeOrigin;
}

export interface BridgeFinalizedArguments {
  tokenAddress: string;
  amount: bigint;
  to: string;
}

export interface BridgeFinalizedEvent {
  eventName: string;
  args: BridgeFinalizedArguments;
  address: string;
  blockNumber: bigint;
  transactionHash: string;
  origin: BridgeOrigin;
}

export interface FunctionCall {
  functionName: string;
  functionSignature: string;
  args: any[];
  from: string;
  to: string;
  value: string;
  gasLimit: bigint;
  gasPrice: bigint;
  transactionHash: string;
  blockNumber?: bigint;
}

export interface ContractFilter {
  address: string;
  abi: ethers.InterfaceAbi;
  events?: string[];
  functions?: string[];
}

export interface BlockchainConnectionConfig {
  wsUrl: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  contractFilters?: ContractFilter[];
}
