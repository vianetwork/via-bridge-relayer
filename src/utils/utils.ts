import { BridgeInitiatedEvent, BridgeFinalizedEvent } from '../types/types';
import { BridgeOrigin } from '../types/types';
import { ethers } from 'ethers';
import { ETHEREUM_BRIDGE_ABI } from '../contracts/EthereumBridge';
import { VIA_BRIDGE_ABI } from '../contracts/ViaBridge';

export const decodeInitiatedLog = (
  origin: BridgeOrigin,
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeInitiatedEvent => {
  return origin === BridgeOrigin.Ethereum
    ? decodeEthInitiatedLog(event, contractAddress, provider)
    : decodeViaInitiatedLog(event, contractAddress, provider);
};

export const decodeEthInitiatedLog = (
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeInitiatedEvent => {
  const contract = new ethers.Contract(
    contractAddress,
    ETHEREUM_BRIDGE_ABI,
    provider
  );
  const data = event.log?.data ?? event.data;
  const topics = event.log?.topics ?? event.topics;
  const [tokenAddress, amount, from, to, value] =
    contract.interface.decodeEventLog(event.fragment.name, data, topics);
  const contractEvent: BridgeInitiatedEvent = {
    eventName: event.fragment.name,
    args: {
      ethTokenAddress: tokenAddress,
      amount,
      from,
      to,
      value,
    },
    address: contractAddress,
    blockNumber: event.log?.blockNumber ?? event.blockNumber,
    transactionHash: event.log?.transactionHash ?? event.transactionHash,
    origin: BridgeOrigin.Ethereum,
  };

  return contractEvent;
};

export const decodeViaInitiatedLog = (
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeInitiatedEvent => {
  const contract = new ethers.Contract(
    contractAddress,
    VIA_BRIDGE_ABI,
    provider
  );
  const data = event.log?.data ?? event.data;
  const topics = event.log?.topics ?? event.topics;
  const [viaTokenAddress, ethTokenAddress, amount, from, to, value] =
    contract.interface.decodeEventLog(event.fragment.name, data, topics);
  const contractEvent: BridgeInitiatedEvent = {
    eventName: event.fragment.name,
    args: {
      viaTokenAddress,
      ethTokenAddress,
      amount,
      from,
      to,
      value,
    },
    address: contractAddress,
    blockNumber: event.log?.blockNumber ?? event.blockNumber,
    transactionHash: event.log?.transactionHash ?? event.transactionHash,
    origin: BridgeOrigin.Ethereum,
  };

  return contractEvent;
};

export const decodeFinalizedLog = (
  origin: BridgeOrigin,
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeFinalizedEvent => {
  return origin === BridgeOrigin.Ethereum
    ? decodeEthFinalizedLog(event, contractAddress, provider)
    : decodeViaFinalizedLog(event, contractAddress, provider);
};

export const decodeEthFinalizedLog = (
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeFinalizedEvent => {
  const contract = new ethers.Contract(
    contractAddress,
    ETHEREUM_BRIDGE_ABI,
    provider
  );
  const data = event.log?.data ?? event.data;
  const topics = event.log?.topics ?? event.topics;
  const [tokenAddress, amount, to] = contract.interface.decodeEventLog(
    event.fragment.name,
    data,
    topics
  );
  const contractEvent: BridgeFinalizedEvent = {
    eventName: event.fragment.name,
    args: {
      tokenAddress,
      amount,
      to,
    },
    address: contractAddress,
    blockNumber: event.log?.blockNumber ?? event.blockNumber,
    transactionHash: event.log?.transactionHash ?? event.transactionHash,
    origin: BridgeOrigin.Ethereum,
  };

  return contractEvent;
};

export const decodeViaFinalizedLog = (
  event: any,
  contractAddress: string,
  provider: ethers.Provider
): BridgeFinalizedEvent => {
  const contract = new ethers.Contract(
    contractAddress,
    VIA_BRIDGE_ABI,
    provider
  );
  const data = event.log?.data ?? event.data;
  const topics = event.log?.topics ?? event.topics;
  const [tokenAddress, amount, to] = contract.interface.decodeEventLog(
    event.fragment.name,
    data,
    topics
  );

  const contractEvent: BridgeFinalizedEvent = {
    eventName: event.fragment.name,
    args: {
      tokenAddress,
      amount,
      to,
    },
    address: contractAddress,
    blockNumber: event.log?.blockNumber ?? event.blockNumber,
    transactionHash: event.log?.transactionHash ?? event.transactionHash,
    origin: BridgeOrigin.Ethereum,
  };

  return contractEvent;
};
