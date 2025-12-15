import { TransactionRepository } from '../../src/database/transaction.repository';
import { Transaction, TransactionStatus } from '../../src/entities/transactions.entity';
import { BridgeOrigin } from '../../src/types/types';
import { BaseRepository } from '../../src/database/base.repository';

// Mock the base repository
jest.mock('../../src/database/base.repository');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
  log: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TransactionRepository', () => {
  let repository: TransactionRepository;
  let mockBaseRepository: any;
  let mockRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
      findOne: jest.fn(),
    };

    mockBaseRepository = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      isConnected: true,
    };

    // Mock the BaseRepository prototype methods
    jest.spyOn(BaseRepository.prototype, 'getRepository').mockImplementation(mockBaseRepository.getRepository);
    jest.spyOn(BaseRepository.prototype, 'create').mockImplementation(mockBaseRepository.create);
    jest.spyOn(BaseRepository.prototype, 'update').mockImplementation(mockBaseRepository.update);
    jest.spyOn(BaseRepository.prototype, 'findMany').mockImplementation(mockBaseRepository.findMany);
    Object.defineProperty(BaseRepository.prototype, 'isConnected', {
      get: () => mockBaseRepository.isConnected,
      configurable: true,
    });

    repository = new TransactionRepository();
  });

  describe('create', () => {
    it('should create transaction and log success', async () => {
      const logger = require('../../src/utils/logger');
      const transactionData = {
        bridgeInitiatedTransactionHash: '0x123',
        status: TransactionStatus.New,
        vaultNonce: 1,
        l1Vault: '0x1',
        l2Vault: '0x2',
        receiver: '0x3',
        shares: 100,
        origin: BridgeOrigin.Ethereum,
        eventType: 'Deposit',
        subgraphId: 'sub-1',
        originBlockNumber: 100
      };
      const createdTransaction = { id: 1, ...transactionData };

      mockRepository.create.mockReturnValue(createdTransaction);
      mockRepository.save.mockResolvedValue(createdTransaction);
      mockBaseRepository.getRepository.mockReturnValue(mockRepository);

      const result = await repository.create(transactionData as any);

      expect(mockRepository.create).toHaveBeenCalledWith(transactionData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdTransaction);
      expect(result).toBe(createdTransaction);
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status without block number', async () => {
      await repository.updateStatus(1, TransactionStatus.Pending);

      expect(mockBaseRepository.update).toHaveBeenCalledWith(1, {
        status: TransactionStatus.Pending,
        blockNumber: undefined,
      });
    });

    it('should update transaction status with block number', async () => {
      await repository.updateStatus(1, TransactionStatus.Finalized, 12345);

      expect(mockBaseRepository.update).toHaveBeenCalledWith(1, {
        status: TransactionStatus.Finalized,
        blockNumber: 12345,
      });
    });
  });

  describe('getTransactionsByStatus', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should get transactions by status and origin', async () => {
      const transactions = [{ id: 1 }, { id: 2 }];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await repository.getTransactionsByStatus(
        TransactionStatus.Pending,
        BridgeOrigin.Ethereum
      );

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('transaction');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.status = :status', {
        status: TransactionStatus.Pending,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.origin = :origin', {
        origin: BridgeOrigin.Ethereum,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('transaction.createdAt', 'ASC');
      expect(result).toBe(transactions);
    });
  });

  describe('getFailedTransactionsWithNoRefunds', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should get failed transactions without refunds', async () => {
      const transactions = [{ id: 1 }, { id: 2 }];
      mockQueryBuilder.getMany.mockResolvedValue(transactions);

      const result = await repository.getFailedTransactionsWithNoRefunds(BridgeOrigin.Ethereum);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('transaction');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'refund_transaction_relations',
        'refundRel',
        'refundRel.transaction_id = transaction.id'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.status = :status', {
        status: TransactionStatus.Failed,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.origin = :origin', {
        origin: BridgeOrigin.Ethereum,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('refundRel.transaction_id IS NULL');
      expect(result).toBe(transactions);
    });
  });

  describe('getTransactionByFinalizedHash', () => {
    it('should find transaction by finalized hash', async () => {
      const transaction = { id: 1, finalizedTransactionHash: '0x456' };
      const transactions = [transaction];
      mockBaseRepository.findMany.mockResolvedValue(transactions);

      const result = await repository.getTransactionByFinalizedHash('0x456');

      expect(mockBaseRepository.findMany).toHaveBeenCalledWith({
        finalizedTransactionHash: '0x456',
      });
      expect(result).toBe(transaction);
    });
  });

  describe('getLastFinalizedBlock', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return max block number for finalized transactions', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxBlock: 100 });

      const result = await repository.getLastFinalizedBlock(BridgeOrigin.Ethereum);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('transaction');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('MAX(transaction.blockNumber)', 'maxBlock');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('transaction.origin = :origin', { origin: BridgeOrigin.Ethereum });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('transaction.status = :status', { status: TransactionStatus.Finalized });
      expect(result).toBe(100);
    });

    it('should return 0 if no transactions found', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxBlock: null });

      const result = await repository.getLastFinalizedBlock(BridgeOrigin.Ethereum);
      expect(result).toBe(0);
    });
  });
});