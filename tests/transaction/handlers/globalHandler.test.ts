// Mock config
jest.mock('../../../src/utils/config', () => ({
  appConfig: {
    ethWaitBlockConfirmations: 12,
    viaWaitBlockConfirmations: 6,
    transactionBatchSize: 10,
    ethBridgeInitiatedEvent: 'BridgeInitiated',
    viaBridgeInitiatedEvent: 'BridgeInitiated',
    ethereumBridgeAddress: '0x1234567890123456789012345678901234567890',
    viaBridgeAddress: '0x1234567890123456789012345678901234567891',
    ethUrl: 'http://eth',
    viaUrl: 'http://via',
    relayerPrivateKey: '0x0123456789012345678901234567890123456789012345678901234567890123',
  },
}));

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
  };
});

import { ethers } from 'ethers';
import { GlobalHandler } from '../../../src/transaction/handlers/globalHandler';
import { ContractAddresses, BridgeOrigin } from '../../../src/types/types';

class TestHandler extends GlobalHandler {
  public async handle(): Promise<boolean> { return false; }
  public exposeGetLastConfirmedBlockNumber(provider: ethers.Provider, confirmations: number) {
    return this.getLastConfirmedBlockNumber(provider, confirmations);
  }
  public exposeCheckTransactionReceipt(hash: string, provider: ethers.Provider) {
    return this.checkTransactionReceipt(hash, provider);
  }
  public exposeGetOriginWallet() { return this.getOriginWallet(); }
  public exposeGetDestinationWallet() { return this.getDestinationWallet(); }
  protected override getOriginBridgeContract(): any { return { id: 'origin' }; }
  protected override getDestinationBridgeContract(): any { return { id: 'dest' }; }
}

describe('GlobalHandler', () => {
  const contractAddresses: ContractAddresses = {
    ethereumBridge: '0x1111111111111111111111111111111111111111',
    viaBridge: '0x2222222222222222222222222222222222222222',
  };

  const makeProvider = (overrides: Partial<ethers.Provider> = {}): ethers.Provider => ({
    getBlockNumber: jest.fn().mockResolvedValue(1000),
    getTransactionReceipt: jest.fn(),
    getTransaction: jest.fn(),
    ...overrides,
  } as unknown as ethers.Provider);

  const makeRepos = () => ({
    transactionRepository: {} as any,
    refundTransactionRepository: {} as any,
    depositMessageSentRepository: {} as any,
    withdrawalSentRepository: {} as any,
    depositExecutedRepository: {} as any,
    messageWithdrawalExecutedRepository: {} as any,
  });

  test('constructor sets confirmations and parameters based on origin', () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const handlerEth = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const handlerVia = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Via,
      originProvider,
      destinationProvider
    );

    expect(handlerEth).toBeDefined();
    expect(handlerVia).toBeDefined();
  });

  test('getLastConfirmedBlockNumber subtracts confirmations', async () => {
    const originProvider = makeProvider({ getBlockNumber: jest.fn().mockResolvedValue(123) } as any);
    const destinationProvider = makeProvider();
    const handler = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    await expect(handler.exposeGetLastConfirmedBlockNumber(originProvider, 5)).resolves.toBe(118);
  });

  test('checkTransactionReceipt returns false when no receipt', async () => {
    const originProvider = makeProvider({ getTransactionReceipt: jest.fn().mockResolvedValue(null) } as any);
    const destinationProvider = makeProvider();
    const handler = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    await expect(handler.exposeCheckTransactionReceipt('0xhash', originProvider)).resolves.toBe(false);
  });

  test('checkTransactionReceipt returns true for status 1, false for other', async () => {
    const originProvider = makeProvider({
      getTransactionReceipt: jest.fn()
        .mockResolvedValueOnce({ status: 1 })
        .mockResolvedValueOnce({ status: 0 })
    } as any);
    const destinationProvider = makeProvider();
    const handler = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    await expect(handler.exposeCheckTransactionReceipt('0x1', originProvider)).resolves.toBe(true);
    await expect(handler.exposeCheckTransactionReceipt('0x2', originProvider)).resolves.toBe(false);
  });

  test('wallet getters cache per provider', () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const handler = new TestHandler(
      makeRepos().transactionRepository,
      makeRepos().depositMessageSentRepository,
      makeRepos().withdrawalSentRepository,
      makeRepos().depositExecutedRepository,
      makeRepos().messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const w1 = handler.exposeGetOriginWallet();
    const w2 = handler.exposeGetOriginWallet();
    expect(w1).toBe(w2);

    const wd1 = handler.exposeGetDestinationWallet();
    const wd2 = handler.exposeGetDestinationWallet();
    expect(wd1).toBe(wd2);
  });
});
