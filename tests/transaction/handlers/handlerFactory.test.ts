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
  },
}));

import { HandlerFactory } from '../../../src/transaction/handlers/handlerFactory';
import { TransactionProcessorStatus, TransactionProcessorArgs } from '../../../src/transaction/transaction.processor';
import { BridgeOrigin } from '../../../src/types/types';

const makeArgs = (status: TransactionProcessorStatus): TransactionProcessorArgs => ({
  status,
  transactionRepository: {} as any,
  depositExecutedRepository: {} as any,
  messageWithdrawalExecutedRepository: {} as any,
  l1MessageSentRepository: {} as any,
  l2MessageSentRepository: {} as any,
  contractAddresses: {
    ethereumBridge: '0x1111111111111111111111111111111111111111',
    viaBridge: '0x2222222222222222222222222222222222222222',
  },
  origin: BridgeOrigin.Ethereum,
  originProvider: {} as any,
  destinationProvider: {} as any,
});

describe('HandlerFactory', () => {
  test('creates BridgeInitiatedHandler for New', () => {
    const handler = HandlerFactory.createHandler(makeArgs(TransactionProcessorStatus.New));
    expect(handler.constructor.name).toBe('BridgeInitiatedHandler');
  });

  test('creates BridgeSendFinalizeHandler for SendFinalize', () => {
    const handler = HandlerFactory.createHandler(makeArgs(TransactionProcessorStatus.SendFinalize));
    expect(handler.constructor.name).toBe('BridgeSendFinalizeHandler');
  });

  test('creates BridgeFinalizeHandler for Pending', () => {
    const handler = HandlerFactory.createHandler(makeArgs(TransactionProcessorStatus.Pending));
    expect(handler.constructor.name).toBe('BridgeFinalizeHandler');
  });

  test('throws on unknown status', () => {
    const args = makeArgs(TransactionProcessorStatus.New) as any;
    args.status = 99999;
    expect(() => HandlerFactory.createHandler(args)).toThrow('Unknown status: 99999');
  });
});
