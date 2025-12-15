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

import { ethers, AbiCoder } from 'ethers';
import { BridgeSendFinalizeHandler } from '../../../../src/transaction/handlers/initiate/bridgeInitiatedHandler';
import { BridgeOrigin, BridgeInitiatedEventStatus } from '../../../../src/types/types';
import { TransactionStatus } from '../../../../src/entities/transactions.entity';

const contractAddresses = {
  ethereumBridge: '0x1111111111111111111111111111111111111111',
  viaBridge: '0x2222222222222222222222222222222222222222',
};

describe('BridgeSendFinalizeHandler', () => {
  const makeProvider = (overrides: any = {}) => ({
    getBlockNumber: jest.fn().mockResolvedValue(200),
    getTransactionReceipt: jest.fn(),
    ...overrides,
  });

  const makeRepos = () => {
    const txRepo = {
      getTransactionsByStatus: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const depositRepo = {};
    const withdrawalRepo = {};
    const depositExecRepo = {};
    const withdrawalExecRepo = {};
    return {
      transactionRepository: txRepo,
      depositMessageSentRepository: depositRepo,
      withdrawalSentRepository: withdrawalRepo,
      depositExecutedRepository: depositExecRepo,
      messageWithdrawalExecutedRepository: withdrawalExecRepo
    } as any;
  };

  test('handle processes transactions and updates statuses', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    const tx = {
      id: 1,
      bridgeInitiatedTransactionHash: '0xinit',
      l1Vault: '0x0000000000000000000000000000000000000002',
      receiver: '0x0000000000000000000000000000000000000005',
      shares: 123,
      l2Vault: '0x0000000000000000000000000000000000000001',
      origin: BridgeOrigin.Ethereum,
      vaultNonce: 1,
      payload: '0xpayload1'
    } as any;

    repos.transactionRepository.getTransactionsByStatus.mockResolvedValueOnce([tx]);

    const handler = new BridgeSendFinalizeHandler(
      repos.transactionRepository,
      repos.depositMessageSentRepository,
      repos.withdrawalSentRepository,
      repos.depositExecutedRepository,
      repos.messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    ) as any;

    // Stub destination bridge contract
    handler.getDestinationBridgeContract = () => ({ receiveMessage: jest.fn().mockResolvedValue({ hash: '0xfinal' }) });

    const res = await handler.handle();
    expect(res).toBe(true);
    expect(repos.transactionRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: TransactionStatus.Pending, finalizedTransactionHash: '0xfinal' }));
  });

  test('handle updates transaction to Failed when processing throws', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    const tx = {
      id: 2,
      bridgeInitiatedTransactionHash: '0xerr',
      l1Vault: '0x0000000000000000000000000000000000000002',
      receiver: '0x0000000000000000000000000000000000000005',
      shares: 123,
      l2Vault: '0x0000000000000000000000000000000000000001',
      origin: BridgeOrigin.Ethereum,
      vaultNonce: 1,
      payload: '0xpayload2'
    } as any;

    repos.transactionRepository.getTransactionsByStatus.mockResolvedValueOnce([tx]);

    const handler = new BridgeSendFinalizeHandler(
      repos.transactionRepository,
      repos.depositMessageSentRepository,
      repos.withdrawalSentRepository,
      repos.depositExecutedRepository,
      repos.messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    ) as any;

    handler.getDestinationBridgeContract = () => ({ receiveMessage: jest.fn().mockRejectedValue(new Error('fail')) });

    const res = await handler.handle();
    expect(res).toBe(false);
    expect(repos.transactionRepository.updateStatus).toHaveBeenCalledWith(2, TransactionStatus.Failed);
  });

  test('finalizeBridgeTransaction returns tx hash using destination bridge', async () => {
    const originProvider = makeProvider();
    const destinationProvider = makeProvider();
    const repos = makeRepos();

    const handler = new BridgeSendFinalizeHandler(
      repos.transactionRepository,
      repos.depositMessageSentRepository,
      repos.withdrawalSentRepository,
      repos.depositExecutedRepository,
      repos.messageWithdrawalExecutedRepository,
      contractAddresses,
      BridgeOrigin.Ethereum,
      originProvider,
      destinationProvider
    ) as any;

    handler.getDestinationBridgeContract = () => ({ receiveMessage: jest.fn().mockResolvedValue({ hash: '0xfinal2' }) });

    const tx = await handler["finalizeBridgeTransaction"]({
      l2Vault: '0x0000000000000000000000000000000000000001',
      receiver: '0x0000000000000000000000000000000000000005',
      shares: 10,
      origin: BridgeOrigin.Ethereum,
      vaultNonce: 1,
      l1Vault: '0x0000000000000000000000000000000000000002',
      payload: '0xpayload3'
    } as any);
    expect(tx.hash).toBe('0xfinal2');
  });
});
