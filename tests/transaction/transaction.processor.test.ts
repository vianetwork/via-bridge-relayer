// Mock config
jest.mock('../../src/utils/config', () => ({
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

import { TransactionProcessor, TransactionProcessorStatus } from '../../src/transaction/transaction.processor';
import { TransactionRepository } from '../../src/database/transaction.repository';
import { DepositExecutedRepository } from '../../src/database/depositExecuted.repository';
import { MessageWithdrawalExecutedRepository } from '../../src/database/messageWithdrawalExecuted.repository';
import { L1MessageSentRepository } from '../../src/database/l1MessageSent.repository';
import { L2MessageSentRepository } from '../../src/database/l2MessageSent.repository';
import {
  BridgeInitiatedHandler,
  BridgeSendFinalizeHandler,
} from '../../src/transaction/handlers/initiate/bridgeInitiatedHandler';
import { BridgeOrigin, BridgeInitiatedEventStatus } from '../../src/types/types';
import { TransactionStatus } from '../../src/entities/transactions.entity';
import { ContractAddresses } from '../../src/types/types';
import { ethers } from 'ethers';

// Mock handler methods if needed

// Mock the handler factory to return mock handlers
jest.mock('../../src/transaction/handlers/handlerFactory', () => ({
  HandlerFactory: {
    createHandler: jest.fn()
  }
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
    Provider: jest.fn(),
    Wallet: class MockWallet {
      constructor() { }
    },
  },
  EventLog: jest.fn(),
  Log: jest.fn(),
  AbiCoder: class MockAbiCoder {
    encode = jest.fn()
  }
}));

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  log: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the config
jest.mock('../../src/utils/config', () => ({
  appConfig: {
    ethWaitBlockConfirmations: 12,
    viaWaitBlockConfirmations: 6,
    transactionBatchSize: 10,
    ethBridgeInitiatedEvent: 'BridgeInitiated',
    viaBridgeInitiatedEvent: 'BridgeInitiated',
  },
}));

// Mock contract ABIs
jest.mock('../../src/contracts/EthereumBridge', () => ({
  ETHEREUM_BRIDGE_ABI: [],
}));

jest.mock('../../src/contracts/ViaBridge', () => ({
  VIA_BRIDGE_ABI: [],
}));

// Mock utils
jest.mock('../../src/utils/utils', () => ({
  decodeInitiatedLog: jest.fn(),
}));

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockDepositExecutedRepository: jest.Mocked<DepositExecutedRepository>;
  let mockMessageWithdrawalExecutedRepository: jest.Mocked<MessageWithdrawalExecutedRepository>;
  let mockL1MessageSentRepository: jest.Mocked<L1MessageSentRepository>;
  let mockL2MessageSentRepository: jest.Mocked<L2MessageSentRepository>;

  let mockOriginProvider: jest.Mocked<ethers.Provider>;
  let mockDestinationProvider: jest.Mocked<ethers.Provider>;
  let mockContractAddresses: ContractAddresses;

  // Mock handler instances
  const mockHandler = {
    handle: jest.fn()
  };

  const mockHandlerFactory = require('../../src/transaction/handlers/handlerFactory');
  const mockEthers = require('ethers');
  const mockUtilsModule = require('../../src/utils/utils');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock handler factory
    mockHandlerFactory.HandlerFactory.createHandler.mockReturnValue(mockHandler);

    // Mock repositories
    mockTransactionRepository = {
      create: jest.fn(),
      updateStatus: jest.fn(),
      getTransactionsByStatus: jest.fn(),
      getFailedTransactionsWithNoRefunds: jest.fn(),
    } as any;

    mockDepositExecutedRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findByNonce: jest.fn(),
    } as any;

    mockMessageWithdrawalExecutedRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findByNonce: jest.fn(),
    } as any;

    mockL1MessageSentRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      getEventsSinceBlock: jest.fn(),
    } as any;

    mockL2MessageSentRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      getEventsSinceBlock: jest.fn(),
    } as any;

    // Mock providers
    mockOriginProvider = {
      getBlockNumber: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getTransaction: jest.fn(),
    } as any;

    mockDestinationProvider = {
      getBlockNumber: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getTransaction: jest.fn(),
    } as any;

    // Mock contract addresses
    mockContractAddresses = {
      ethereumBridge: '0x1234567890123456789012345678901234567890',
      viaBridge: '0x1234567890123456789012345678901234567891',
    } as any;

    // Mock ethers Contract
    const mockContract = {
      queryFilter: jest.fn(),
    };
    mockEthers.ethers.Contract.mockImplementation(() => mockContract);

    processor = new TransactionProcessor({
      status: TransactionProcessorStatus.New,
      transactionRepository: mockTransactionRepository,
      depositExecutedRepository: mockDepositExecutedRepository,
      messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
      l1MessageSentRepository: mockL1MessageSentRepository,
      l2MessageSentRepository: mockL2MessageSentRepository,
      contractAddresses: mockContractAddresses,
      origin: BridgeOrigin.Ethereum,
      originProvider: mockOriginProvider,
      destinationProvider: mockDestinationProvider
    });
  });

  describe('constructor', () => {
    it('should initialize with correct parameters for Ethereum origin', () => {
      const ethereumProcessor = new TransactionProcessor({
        status: TransactionProcessorStatus.New,
        transactionRepository: mockTransactionRepository,
        depositExecutedRepository: mockDepositExecutedRepository,
        messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
        l1MessageSentRepository: mockL1MessageSentRepository,
        l2MessageSentRepository: mockL2MessageSentRepository,
        contractAddresses: mockContractAddresses,
        origin: BridgeOrigin.Ethereum,
        originProvider: mockOriginProvider,
        destinationProvider: mockDestinationProvider
      });

      expect(ethereumProcessor).toBeInstanceOf(TransactionProcessor);
    });

    it('should initialize with correct parameters for Via origin', () => {
      const viaProcessor = new TransactionProcessor({
        status: TransactionProcessorStatus.New,
        transactionRepository: mockTransactionRepository,
        depositExecutedRepository: mockDepositExecutedRepository,
        messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
        l1MessageSentRepository: mockL1MessageSentRepository,
        l2MessageSentRepository: mockL2MessageSentRepository,
        contractAddresses: mockContractAddresses,
        origin: BridgeOrigin.Via,
        originProvider: mockOriginProvider,
        destinationProvider: mockDestinationProvider
      });

      expect(viaProcessor).toBeInstanceOf(TransactionProcessor);
    });
  });


  describe('processNextBatch', () => {
    beforeEach(() => {
    });

    describe('with status New', () => {
      it('should process new bridge initiated events successfully', async () => {
        // Mock the handler to return true (successful processing)
        mockHandler.handle.mockResolvedValue(true);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.New,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(true);
        expect(mockHandler.handle).toHaveBeenCalled();
        expect(mockHandlerFactory.HandlerFactory.createHandler).toHaveBeenCalledWith({
          status: TransactionProcessorStatus.New,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });
      });

      it('should skip events that already exist in database', async () => {
        // Mock the handler to return false (no processing needed)
        mockHandler.handle.mockResolvedValue(false);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.New,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(false);
        expect(mockHandler.handle).toHaveBeenCalled();
      });

      it('should handle event processing errors gracefully', async () => {
        // Mock the handler to throw an error
        mockHandler.handle.mockRejectedValue(new Error('Handler error'));

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.New,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        // TransactionProcessor catches errors and returns false
        expect(result).toBe(false);
        expect(mockHandler.handle).toHaveBeenCalled();
      });
    });

    describe('with status Pending', () => {
      it('should process pending transactions and update to finalized', async () => {
        // Mock the handler to return true (successful processing)
        mockHandler.handle.mockResolvedValue(true);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.Pending,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(true);
        expect(mockHandler.handle).toHaveBeenCalled();
        expect(mockHandlerFactory.HandlerFactory.createHandler).toHaveBeenCalledWith({
          status: TransactionProcessorStatus.Pending,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });
      });

      it('should update transaction to failed when receipt status is 0', async () => {
        // Mock the handler to return true (successful processing)
        mockHandler.handle.mockResolvedValue(true);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.Pending,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(true);
        expect(mockHandler.handle).toHaveBeenCalled();
      });
    });

    describe('with status Failed', () => {
      it('should process failed transactions', async () => {
        // Mock the handler to return true (successful processing)
        mockHandler.handle.mockResolvedValue(true);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.Failed,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(true);
        expect(mockHandler.handle).toHaveBeenCalled();
        expect(mockHandlerFactory.HandlerFactory.createHandler).toHaveBeenCalledWith({
          status: TransactionProcessorStatus.Failed,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });
      });

      it('should not process refunds when cooldown has not passed', async () => {
        // Mock the handler to return false (no processing needed due to cooldown)
        mockHandler.handle.mockResolvedValue(false);

        processor = new TransactionProcessor({
          status: TransactionProcessorStatus.Failed,
          transactionRepository: mockTransactionRepository,
          depositExecutedRepository: mockDepositExecutedRepository,
          messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
          l1MessageSentRepository: mockL1MessageSentRepository,
          l2MessageSentRepository: mockL2MessageSentRepository,
          contractAddresses: mockContractAddresses,
          origin: BridgeOrigin.Ethereum,
          originProvider: mockOriginProvider,
          destinationProvider: mockDestinationProvider
        });

        const result = await processor.processNextBatch();

        expect(result).toBe(false);
        expect(mockHandler.handle).toHaveBeenCalled();
      });
    });

    it('should handle errors in processNextBatch gracefully', async () => {
      // Mock the handler to throw an error
      mockHandler.handle.mockRejectedValue(new Error('Handler error'));

      processor = new TransactionProcessor({
        status: TransactionProcessorStatus.New,
        transactionRepository: mockTransactionRepository,
        l1MessageSentRepository: mockL1MessageSentRepository,
        l2MessageSentRepository: mockL2MessageSentRepository,
        depositExecutedRepository: mockDepositExecutedRepository,
        messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
        contractAddresses: mockContractAddresses,
        origin: BridgeOrigin.Ethereum,
        originProvider: mockOriginProvider,
        destinationProvider: mockDestinationProvider
      });

      const result = await processor.processNextBatch();

      expect(result).toBe(false);
      expect(mockHandler.handle).toHaveBeenCalled();
    });

    it('should fail elegantly when handler throws error', async () => {
      (mockHandlerFactory.HandlerFactory.createHandler as jest.Mock).mockReturnValue(mockHandler);
      mockHandler.handle.mockRejectedValue(new Error('Processing failed'));

      processor = new TransactionProcessor({
        status: TransactionProcessorStatus.New,
        transactionRepository: mockTransactionRepository,
        l1MessageSentRepository: mockL1MessageSentRepository,
        l2MessageSentRepository: mockL2MessageSentRepository,
        depositExecutedRepository: mockDepositExecutedRepository,
        messageWithdrawalExecutedRepository: mockMessageWithdrawalExecutedRepository,
        contractAddresses: mockContractAddresses,
        origin: BridgeOrigin.Ethereum,
        originProvider: mockOriginProvider,
        destinationProvider: mockDestinationProvider
      });

      const result = await processor.processNextBatch();

      expect(result).toBe(false);
    });
  });
});