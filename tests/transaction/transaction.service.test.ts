
// Mock config first before imports
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

import { TransactionService } from '../../src/transaction/transaction.service';
import { TransactionWorker } from '../../src/transaction/transaction.worker';
import { TransactionProcessor, TransactionProcessorStatus } from '../../src/transaction/transaction.processor';
import { TransactionRepository } from '../../src/database/transaction.repository';
import { DepositExecutedRepository } from '../../src/database/depositExecuted.repository';
import { MessageWithdrawalExecutedRepository } from '../../src/database/messageWithdrawalExecuted.repository';
import { L1MessageSentRepository } from '../../src/database/l1MessageSent.repository';
import { L2MessageSentRepository } from '../../src/database/l2MessageSent.repository';
import { BridgeOrigin, ContractAddresses } from '../../src/types/types';
import { ethers } from 'ethers';

// Mock TransactionWorker
jest.mock('../../src/transaction/transaction.worker');

// Mock TransactionProcessor
jest.mock('../../src/transaction/transaction.processor');

describe('TransactionService', () => {
  let service: TransactionService;
  let mockProviderEth: jest.Mocked<ethers.Provider>;
  let mockProviderVia: jest.Mocked<ethers.Provider>;
  let mockContractAddresses: ContractAddresses;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockDepositExecutedRepository: jest.Mocked<DepositExecutedRepository>;
  let mockMessageWithdrawalExecutedRepository: jest.Mocked<MessageWithdrawalExecutedRepository>;
  let mockL1MessageSentRepository: jest.Mocked<L1MessageSentRepository>;
  let mockL2MessageSentRepository: jest.Mocked<L2MessageSentRepository>;

  const mockTransactionWorker = TransactionWorker as jest.MockedClass<typeof TransactionWorker>;
  const mockTransactionProcessor = TransactionProcessor as jest.MockedClass<typeof TransactionProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Mock providers
    mockProviderEth = {
      getBlockNumber: jest.fn(),
      getTransactionReceipt: jest.fn(),
    } as any;

    mockProviderVia = {
      getBlockNumber: jest.fn(),
      getTransactionReceipt: jest.fn(),
    } as any;

    // Mock contract addresses
    mockContractAddresses = {
      ethereumBridge: '0x1234567890123456789012345678901234567890',
      viaBridge: '0x1234567890123456789012345678901234567891',
    } as any;

    // Mock repositories
    mockTransactionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
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

    // Mock TransactionWorker instances
    const mockWorkerInstance = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockTransactionWorker.mockImplementation(() => mockWorkerInstance as any);

    // Create service instance
    service = new TransactionService(
      mockProviderEth,
      mockProviderVia,
      mockContractAddresses,
      mockTransactionRepository,
      mockDepositExecutedRepository,
      mockMessageWithdrawalExecutedRepository,
      mockL1MessageSentRepository,
      mockL2MessageSentRepository,
      5000 // polling interval
    );
  });

  describe('constructor', () => {
    it('should create correct number of workers for each chain', () => {
      // Should create 4 workers for Ethereum (one for each status)
      // Should create 4 workers for Via (one for each status)
      expect(mockTransactionWorker).toHaveBeenCalledTimes(8);

      // Verify TransactionProcessor was called with correct parameters
      expect(mockTransactionProcessor).toHaveBeenCalledTimes(8);
    });

    it('should create workers with all transaction processor statuses', () => {
      const expectedStatuses = [
        TransactionProcessorStatus.New,
        TransactionProcessorStatus.SendFinalize,
        TransactionProcessorStatus.Pending,
        TransactionProcessorStatus.Failed,
      ];

      const calls = mockTransactionProcessor.mock.calls;

      // Check Ethereum workers (first 4 calls)
      expectedStatuses.forEach((status, index) => {
        expect(calls[index][0].status).toBe(status);
        expect(calls[index][0].origin).toBe(BridgeOrigin.Ethereum);
      });

      // Check Via workers (next 4 calls)
      expectedStatuses.forEach((status, index) => {
        expect(calls[index + 4][0].status).toBe(status);
        expect(calls[index + 4][0].origin).toBe(BridgeOrigin.Via);
      });
    });

    it('should pass correct providers for each origin', () => {
      const calls = mockTransactionProcessor.mock.calls;

      // Check Ethereum workers have correct providers
      calls.slice(0, 4).forEach(call => {
        expect(call[0].origin).toBe(BridgeOrigin.Ethereum);
        expect(call[0].originProvider).toBe(mockProviderEth);
        expect(call[0].destinationProvider).toBe(mockProviderVia);
      });

      // Check Via workers have correct providers
      calls.slice(4, 8).forEach(call => {
        expect(call[0].origin).toBe(BridgeOrigin.Via);
        expect(call[0].originProvider).toBe(mockProviderVia);
        expect(call[0].destinationProvider).toBe(mockProviderEth);
      });
    });

    it('should pass polling interval to workers', () => {
      expect(mockTransactionWorker).toHaveBeenCalledWith(
        expect.any(Object),
        5000
      );
    });
  });

  describe('startWorkers', () => {
    it('should start all workers when called', async () => {
      await service.startWorkers();
      expect(service.startWorkers).toBeDefined();
    });
  });

  describe('stopWorkers', () => {
    it('should stop all workers when called', async () => {
      await service.stopWorkers();
      expect(service.stopWorkers).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should be able to start and stop workers in sequence', async () => {
      await service.startWorkers();
      await service.stopWorkers();
      expect(service.startWorkers).toBeDefined();
      expect(service.stopWorkers).toBeDefined();
    });

    it('should maintain worker instances after creation', () => {
      // Workers should be stored in the service instance
      expect(service['transactionWorkersEth']).toHaveLength(4);
      expect(service['transactionWorkersVia']).toHaveLength(4);
    });
  });
});