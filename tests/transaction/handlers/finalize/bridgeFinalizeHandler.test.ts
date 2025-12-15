import { BridgeFinalizeHandler } from '../../../../src/transaction/handlers/finalize/bridgeFinalizeHandler';
import { BridgeOrigin } from '../../../../src/types/types';
import { TransactionStatus } from '../../../../src/entities/transactions.entity';

const contractAddresses = {
  ethereumBridge: '0x1111111111111111111111111111111111111111',
  viaBridge: '0x2222222222222222222222222222222222222222',
};

jest.mock('../../../../src/utils/config', () => ({
  appConfig: {
    withdrawalFinalizationConfirmations: 5,
    ethWaitBlockConfirmations: 2,
    viaWaitBlockConfirmations: 2,
    transactionBatchSize: 10,
  }
}));

describe('BridgeFinalizeHandler', () => {
  const makeProvider = (overrides: any = {}) => ({
    getBlockNumber: jest.fn().mockResolvedValue(200),
    getTransactionReceipt: jest.fn(),
    getTransaction: jest.fn(),
    ...overrides,
  });

  const makeRepos = () => {
    const txRepo = {
      getLastFinalizedBlock: jest.fn().mockResolvedValue(100),
      getTransactionByFinalizedHash: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const depositExecRepo = {
      getEventsSinceBlock: jest.fn().mockResolvedValue([]),
    };
    const withdrawalExecRepo = {
      getEventsSinceBlock: jest.fn().mockResolvedValue([]),
    };

    return {
      transactionRepository: txRepo,
      depositExecutedRepository: depositExecRepo,
      messageWithdrawalExecutedRepository: withdrawalExecRepo,
      l1MessageSentRepository: {} as any,
      l2MessageSentRepository: {} as any,
    };
  };

  test('handle returns false when no new events', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    const handler = new BridgeFinalizeHandler(
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
    expect(repos.transactionRepository.getLastFinalizedBlock).toHaveBeenCalledWith(BridgeOrigin.Ethereum);
    expect(repos.depositExecutedRepository.getEventsSinceBlock).toHaveBeenCalled();
  });

  test('matches transaction by hash and updates status', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    // Mock event
    const mockEvent = {
      id: 'event-1',
      blockNumber: 150,
      transactionHash: '0xfinalizedHash'
    };
    repos.depositExecutedRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    // Mock pending transaction found
    repos.transactionRepository.getTransactionByFinalizedHash.mockResolvedValue({
      id: 1,
      status: TransactionStatus.Pending,
      bridgeInitiatedTransactionHash: '0xinitHash'
    });

    const handler = new BridgeFinalizeHandler(
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
    expect(repos.transactionRepository.getTransactionByFinalizedHash).toHaveBeenCalledWith('0xfinalizedHash');
    expect(repos.transactionRepository.updateStatus).toHaveBeenCalledWith(1, TransactionStatus.Finalized, 150);
  });

  test('does not update if transaction is not pending', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    // Mock event
    const mockEvent = {
      id: 'event-1',
      blockNumber: 150,
      transactionHash: '0xfinalizedHash'
    };
    repos.depositExecutedRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    // Mock already finalized transaction
    repos.transactionRepository.getTransactionByFinalizedHash.mockResolvedValue({
      id: 1,
      status: TransactionStatus.Finalized, // Already finalized
      bridgeInitiatedTransactionHash: '0xinitHash'
    });

    const handler = new BridgeFinalizeHandler(
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

    // Should return false as no NEW processing happened (or true if considered processed? Implementation returns hasProcessedItems based on updates)
    // Implementation: hasProcessedItems = true ONLY if updateStatus is called.
    expect(res).toBe(false);
    expect(repos.transactionRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('handles withdrawal events for Via origin', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    // Mock event
    const mockEvent = {
      id: 'event-2',
      blockNumber: 160,
      transactionHash: '0xfinalizedHashVia'
    };
    // Via origin uses withdrawal repo
    repos.messageWithdrawalExecutedRepository.getEventsSinceBlock.mockResolvedValue([mockEvent]);

    // Mock pending transaction found
    repos.transactionRepository.getTransactionByFinalizedHash.mockResolvedValue({
      id: 2,
      status: TransactionStatus.Pending,
      bridgeInitiatedTransactionHash: '0xinitHashVia'
    });

    const handler = new BridgeFinalizeHandler(
      repos.transactionRepository as any,
      repos.depositExecutedRepository as any,
      repos.messageWithdrawalExecutedRepository as any,
      repos.l1MessageSentRepository as any,
      repos.l2MessageSentRepository as any,
      contractAddresses,
      BridgeOrigin.Via, // Via origin
      originProvider,
      destinationProvider
    );

    const res = await handler.handle();

    expect(res).toBe(true);
    expect(repos.messageWithdrawalExecutedRepository.getEventsSinceBlock).toHaveBeenCalled();
    expect(repos.transactionRepository.updateStatus).toHaveBeenCalledWith(2, TransactionStatus.Finalized, 160);
  });
});
