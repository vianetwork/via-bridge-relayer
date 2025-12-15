// Mock config
jest.mock('../../../../src/utils/config', () => ({
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
  },
}));

import { BridgeInitiatedHandler } from '../../../../src/transaction/handlers/initiate/bridgeInitiatedHandler';
import { BridgeOrigin } from '../../../../src/types/types';

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const contractAddresses = {
  ethereumBridge: '0x1111111111111111111111111111111111111111',
  viaBridge: '0x2222222222222222222222222222222222222222',
};

describe('BridgeInitiatedHandler', () => {
  const makeProvider = (overrides: any = {}) => ({
    getBlockNumber: jest.fn().mockResolvedValue(200),
    getTransactionReceipt: jest.fn(),
    ...overrides,
  });

  const makeRepos = () => {
    const txRepo = {
      findByBridgeInitiatedTransactionHash: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      getLastProcessedBlock: jest.fn().mockResolvedValue(100),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const l1MessageSentRepo = {
      findMany: jest.fn().mockResolvedValue([]),
      getEventsSinceBlock: jest.fn().mockResolvedValue([]),
    };
    const l2MessageSentRepo = {
      findMany: jest.fn().mockResolvedValue([]),
      getEventsSinceBlock: jest.fn().mockResolvedValue([]),
    };
    const depositExecRepo = {};
    const withdrawalExecRepo = {};

    return {
      transactionRepository: txRepo,
      l1MessageSentRepository: l1MessageSentRepo,
      l2MessageSentRepository: l2MessageSentRepo,
      depositExecutedRepository: depositExecRepo,
      messageWithdrawalExecutedRepository: withdrawalExecRepo
    };
  };

  test('handle returns false when no events in DB', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();
    const handler = new BridgeInitiatedHandler(
      repos.transactionRepository as any,
      repos.depositExecutedRepository as any,
      repos.messageWithdrawalExecutedRepository as any,
      repos.l1MessageSentRepository as any,
      repos.l2MessageSentRepository as any,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const res = await handler.handle();
    expect(res).toBe(false);
    expect(repos.l1MessageSentRepository.getEventsSinceBlock).toHaveBeenCalled();
  });

  test('skips when transaction already exists', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    // Mock existing transaction
    repos.transactionRepository.findByBridgeInitiatedTransactionHash.mockResolvedValue({ id: 123 });

    // Mock DB event
    const mockEvent = {
      id: '0xA',
      vaultNonce: 1,
      l1Vault: '0xL1',
      l2Vault: '0xL2',
      receiver: '0xR',
      shares: 100n,
      transactionHash: '0xA-TxHash',
      blockNumber: 10,
      payload: '0xpayloadA',
    };
    repos.l1MessageSentRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    const handler = new BridgeInitiatedHandler(
      repos.transactionRepository as any,
      repos.depositExecutedRepository as any,
      repos.messageWithdrawalExecutedRepository as any,
      repos.l1MessageSentRepository as any,
      repos.l2MessageSentRepository as any,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const res = await handler.handle();
    expect(res).toBe(false);
    expect(repos.transactionRepository.create).not.toHaveBeenCalled();
  });

  test('creates new transaction when not existing', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    repos.transactionRepository.findByBridgeInitiatedTransactionHash.mockResolvedValue(null);

    const mockEvent = {
      id: '0xB',
      vaultNonce: 2,
      l1Vault: '0xL1',
      l2Vault: '0xL2',
      receiver: '0xR',
      shares: 100n,
      transactionHash: '0xB-TxHash',
      blockNumber: 11,
      payload: '0xpayloadB',
    };
    repos.l1MessageSentRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    // Mock the destination bridge contract
    const mockBridgeContract = {
      receiveMessage: jest.fn().mockResolvedValue({ hash: '0xFinalizedHash' }),
    };
    jest.spyOn(BridgeInitiatedHandler.prototype as any, 'getDestinationBridgeContract').mockReturnValue(mockBridgeContract);

    const handler = new BridgeInitiatedHandler(
      repos.transactionRepository as any,
      repos.depositExecutedRepository as any,
      repos.messageWithdrawalExecutedRepository as any,
      repos.l1MessageSentRepository as any,
      repos.l2MessageSentRepository as any,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const res = await handler.handle();

    expect(res).toBe(true);
    expect(repos.transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      bridgeInitiatedTransactionHash: '0xB-TxHash',
      payload: '0xpayloadB',
      origin: BridgeOrigin.Ethereum
    }));
  });

  test('returns true on error in processing loop', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    repos.transactionRepository.findByBridgeInitiatedTransactionHash.mockResolvedValue(null);

    const mockEvent = {
      id: '0xERR',
      vaultNonce: 3,
      transactionHash: '0xERR-TxHash',
      blockNumber: 12,
      payload: '0xpayload',
    };

    // Mock the destination bridge contract to throw
    const mockBridgeContract = {
      receiveMessage: jest.fn().mockRejectedValue(new Error("Bridge Error")),
    };
    jest.spyOn(BridgeInitiatedHandler.prototype as any, 'getDestinationBridgeContract').mockReturnValue(mockBridgeContract);

    repos.l1MessageSentRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    const handler = new BridgeInitiatedHandler(
      repos.transactionRepository as any,
      repos.depositExecutedRepository as any,
      repos.messageWithdrawalExecutedRepository as any,
      repos.l1MessageSentRepository as any,
      repos.l2MessageSentRepository as any,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    );

    const res = await handler.handle();
    // Catch block returns `true`.
    expect(res).toBe(true);
  });
});
