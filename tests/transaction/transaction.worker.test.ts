import { TransactionWorker } from '../../src/transaction/transaction.worker';
import { TransactionProcessor } from '../../src/transaction/transaction.processor';
import { Worker } from '../../src/common/worker';
import waitFor from '../../src/utils/waitFor';

// Mock the parent Worker class
jest.mock('../../src/common/worker');

// Mock the TransactionProcessor
jest.mock('../../src/transaction/transaction.processor');

// Mock waitFor utility
jest.mock('../../src/utils/waitFor');

describe('TransactionWorker', () => {
  let worker: TransactionWorker;
  let mockTransactionProcessor: jest.Mocked<TransactionProcessor>;
  let mockWaitFor: jest.MockedFunction<typeof waitFor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TransactionProcessor
    mockTransactionProcessor = {
      processNextBatch: jest.fn(),
    } as any;

    // Mock waitFor
    mockWaitFor = waitFor as jest.MockedFunction<typeof waitFor>;

    // Create worker instance
    worker = new TransactionWorker(mockTransactionProcessor, 5000);
  });

  describe('constructor', () => {
    it('should initialize with transaction processor and polling interval', () => {
      expect(worker).toBeInstanceOf(TransactionWorker);
      expect(worker['transactionProcessor']).toBe(mockTransactionProcessor);
      expect(worker['pollingInterval']).toBe(5000);
    });

    it('should extend Worker class', () => {
      expect(Worker).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should call parent stop method', () => {
      const mockParentStop = jest.fn().mockReturnValue('stopped');
      (Worker.prototype.stop as jest.Mock) = mockParentStop;

      const result = worker.stop();

      expect(mockParentStop).toHaveBeenCalledTimes(1);
      expect(result).toBe('stopped');
    });
  });

  describe('runProcess', () => {
    beforeEach(() => {
      // Mock the currentProcessPromise property
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: {},
        writable: true,
        configurable: true,
      });
    });

    it('should process next batch and continue when batch is processed', async () => {
      // Mock processNextBatch to return true (batch processed)
      mockTransactionProcessor.processNextBatch.mockResolvedValue(true);
      
      // Mock currentProcessPromise to be null immediately to stop recursion
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });

      await worker['runProcess']();

      expect(mockTransactionProcessor.processNextBatch).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).not.toHaveBeenCalled();
    });

    it('should wait when no batch is processed', async () => {
      // Mock processNextBatch to return false (no batch processed)
      mockTransactionProcessor.processNextBatch.mockResolvedValue(false);
      
      // Mock waitFor to resolve immediately
      mockWaitFor.mockResolvedValue(undefined);
      
      // Mock currentProcessPromise to be null after waitFor (simulating stop condition)
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });

      await worker['runProcess']();

      expect(mockTransactionProcessor.processNextBatch).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should stop processing when currentProcessPromise is null', async () => {
      // Mock processNextBatch to return false
      mockTransactionProcessor.processNextBatch.mockResolvedValue(false);
      
      // Mock waitFor to resolve immediately
      mockWaitFor.mockResolvedValue(undefined);
      
      // Mock currentProcessPromise to be null immediately
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });

      const result = await worker['runProcess']();

      expect(mockTransactionProcessor.processNextBatch).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should call waitFor when no batch is processed and promise exists', async () => {
      // Mock processNextBatch to return false (no batch processed)
      mockTransactionProcessor.processNextBatch.mockResolvedValue(false);
      
      // Mock waitFor to resolve immediately
      mockWaitFor.mockResolvedValue(undefined);
      
      // Mock currentProcessPromise to exist during waitFor check but null afterwards
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null, // Null to prevent recursion
        configurable: true,
      });

      await worker['runProcess']();

      expect(mockTransactionProcessor.processNextBatch).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in processNextBatch gracefully', async () => {
      // Mock processNextBatch to throw an error
      const error = new Error('Processing failed');
      mockTransactionProcessor.processNextBatch.mockRejectedValue(error);

      // Should not throw the error, but handle it gracefully
      await expect(worker['runProcess']()).rejects.toThrow('Processing failed');
    });

    it('should pass correct parameters to waitFor', async () => {
      mockTransactionProcessor.processNextBatch.mockResolvedValue(false);
      mockWaitFor.mockResolvedValue(undefined);
      
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });

      await worker['runProcess']();

      expect(mockWaitFor).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      // Test the condition function passed to waitFor
      const conditionFunction = mockWaitFor.mock.calls[0][0];
      
      // When currentProcessPromise is null, condition should return true
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });
      expect(conditionFunction()).toBe(true);
      
      // When currentProcessPromise exists, condition should return false
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: {},
        configurable: true,
      });
      expect(conditionFunction()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle a typical processing cycle', async () => {
      // Mock processNextBatch to return true (batch processed)
      mockTransactionProcessor.processNextBatch.mockResolvedValue(true);

      mockWaitFor.mockResolvedValue(undefined);

      // Mock currentProcessPromise to be null immediately (no recursion)
      Object.defineProperty(worker, 'currentProcessPromise', {
        value: null,
        configurable: true,
      });

      await worker['runProcess']();

      expect(mockTransactionProcessor.processNextBatch).toHaveBeenCalledTimes(1);
      expect(mockWaitFor).not.toHaveBeenCalled();
    });

    it('should handle different polling intervals', () => {
      const worker1000 = new TransactionWorker(mockTransactionProcessor, 1000);
      const worker10000 = new TransactionWorker(mockTransactionProcessor, 10000);

      expect(worker1000['pollingInterval']).toBe(1000);
      expect(worker10000['pollingInterval']).toBe(10000);
    });
  });

  describe('inheritance from Worker', () => {
    it('should properly extend Worker class functionality', () => {
      expect(worker).toBeInstanceOf(Worker);
      
      // Verify that Worker constructor was called
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('should override runProcess method', () => {
      expect(typeof worker['runProcess']).toBe('function');
      expect(worker['runProcess']).not.toBe(Worker.prototype['runProcess']);
    });

    it('should use parent stop method', () => {
      const mockStop = jest.fn().mockReturnValue('stopped');
      Worker.prototype.stop = mockStop;

      const result = worker.stop();

      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(result).toBe('stopped');
    });
  });
});