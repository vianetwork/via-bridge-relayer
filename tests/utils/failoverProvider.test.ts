import { ethers } from 'ethers';
import { FailoverProvider, FailoverProviderConfig } from '../../src/utils/failoverProvider';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    AbstractProvider: class AbstractProvider {},
    JsonRpcProvider: jest.fn().mockImplementation((url) => ({
      url,
      pollingInterval: 4000,
      getBlockNumber: jest.fn(),
      getBlock: jest.fn(),
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getBalance: jest.fn(),
      getCode: jest.fn(),
      getStorage: jest.fn(),
      call: jest.fn(),
      estimateGas: jest.fn(),
      broadcastTransaction: jest.fn(),
      getLogs: jest.fn(),
      getNetwork: jest.fn(),
      getFeeData: jest.fn(),
      getTransactionCount: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      _detectNetwork: jest.fn(),
      send: jest.fn(),
    })),
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FailoverProvider', () => {
  let mockProviders: any[];
  let config: FailoverProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockProviders = [];
    (ethers.JsonRpcProvider as jest.Mock).mockImplementation((url) => {
      const provider = {
        url,
        pollingInterval: 4000,
        getBlockNumber: jest.fn().mockResolvedValue(12345),
        getBlock: jest.fn().mockResolvedValue({ number: 12345 }),
        getTransaction: jest.fn().mockResolvedValue({ hash: '0x123' }),
        getTransactionReceipt: jest.fn().mockResolvedValue({ status: 1 }),
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
        getCode: jest.fn().mockResolvedValue('0x'),
        getStorage: jest.fn().mockResolvedValue('0x0'),
        call: jest.fn().mockResolvedValue('0x'),
        estimateGas: jest.fn().mockResolvedValue(BigInt('21000')),
        broadcastTransaction: jest.fn().mockResolvedValue({ hash: '0x456' }),
        getLogs: jest.fn().mockResolvedValue([]),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigInt('20000000000') }),
        getTransactionCount: jest.fn().mockResolvedValue(42),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn(),
        _detectNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
        send: jest.fn().mockResolvedValue({}),
      };
      mockProviders.push(provider);
      return provider;
    });

    config = {
      rpcUrls: ['http://rpc1.example.com', 'http://rpc2.example.com', 'http://rpc3.example.com'],
      maxRetries: 3,
      retryDelay: 100,
      requestTimeout: 1000,
      autoFailover: true,
      name: 'TestProvider',
    };
  });

  describe('constructor', () => {
    it('should create FailoverProvider with valid config', () => {
      const provider = new FailoverProvider(config);
      
      expect(provider).toBeInstanceOf(FailoverProvider);
      expect(provider.getProviderStatus().totalProviders).toBe(3);
      expect(provider.getProviderStatus().currentIndex).toBe(0);
      expect(provider.getProviderStatus().name).toBe('TestProvider');
    });

    it('should throw error when no RPC URLs provided', () => {
      const invalidConfig = { ...config, rpcUrls: [] };
      
      expect(() => new FailoverProvider(invalidConfig)).toThrow('At least one RPC URL must be provided');
    });

    it('should use default values for optional config', () => {
      const minimalConfig = { rpcUrls: ['http://rpc1.example.com'] };
      const provider = new FailoverProvider(minimalConfig);
      
      const status = provider.getProviderStatus();
      expect(status.name).toBe('FailoverProvider');
      expect(status.totalProviders).toBe(1);
    });

    it('should create JsonRpcProviders for each URL', () => {
      new FailoverProvider(config);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledTimes(3);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://rpc1.example.com', undefined, { staticNetwork: true });
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://rpc2.example.com', undefined, { staticNetwork: true });
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://rpc3.example.com', undefined, { staticNetwork: true });
    });
  });

  describe('getProviderStatus', () => {
    it('should return current provider status', () => {
      const provider = new FailoverProvider(config);
      const status = provider.getProviderStatus();
      
      expect(status).toEqual({
        currentIndex: 0,
        currentUrl: 'http://rpc1.example.com',
        totalProviders: 3,
        healthStatus: [true, true, true],
        name: 'TestProvider',
      });
    });
  });

  describe('switchToNextProvider', () => {
    it('should switch to next healthy provider', () => {
      const provider = new FailoverProvider(config);
      
      const switched = provider.switchToNextProvider();
      
      expect(switched).toBe(true);
      expect(provider.getProviderStatus().currentIndex).toBe(1);
    });

    it('should skip unhealthy providers', () => {
      const provider = new FailoverProvider(config);
      const status = provider.getProviderStatus();
      
      // Mark provider 1 as unhealthy
      status.healthStatus[1] = false;
      
      provider.switchToNextProvider();
      
      expect(provider.getProviderStatus().currentIndex).toBe(2);
    });

    it('should reset all providers to healthy if all are unhealthy', () => {
      const provider = new FailoverProvider(config);
      const status = provider.getProviderStatus();
      
      // Mark all providers as unhealthy
      status.healthStatus.fill(false);
      
      const switched = provider.switchToNextProvider();
      
      expect(switched).toBe(false);
      expect(provider.getProviderStatus().healthStatus).toEqual([true, true, true]);
      expect(provider.getProviderStatus().currentIndex).toBe(1);
    });
  });

  describe('executeWithFailover', () => {
    it('should execute method successfully on first try', async () => {
      const provider = new FailoverProvider(config);
      
      const result = await provider.getBlockNumber();
      
      expect(result).toBe(12345);
      expect(mockProviders[0].getBlockNumber).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const provider = new FailoverProvider(config);
      
      // Make first call fail with network error, which should trigger failover
      mockProviders[0].getBlockNumber.mockRejectedValue(new Error('network error'));
      mockProviders[1].getBlockNumber.mockResolvedValue(12345);
      
      const result = await provider.getBlockNumber();
      
      expect(result).toBe(12345);
      // First provider should be called once and fail, then switch to second provider
      expect(mockProviders[0].getBlockNumber).toHaveBeenCalledTimes(1);
      expect(mockProviders[1].getBlockNumber).toHaveBeenCalledTimes(1);
    });

    it('should failover to next provider on network error', async () => {
      const provider = new FailoverProvider(config);
      
      // Make first provider fail with network error
      mockProviders[0].getBlockNumber.mockRejectedValue(new Error('network error'));
      
      const result = await provider.getBlockNumber();
      
      expect(result).toBe(12345);
      expect(mockProviders[0].getBlockNumber).toHaveBeenCalledTimes(1);
      expect(mockProviders[1].getBlockNumber).toHaveBeenCalledTimes(1);
      expect(provider.getProviderStatus().currentIndex).toBe(1);
    });

    it('should handle timeout', async () => {
      const provider = new FailoverProvider({ ...config, requestTimeout: 50 });
      
      // Make first provider hang
      mockProviders[0].getBlockNumber.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const result = await provider.getBlockNumber();
      
      // Should failover to second provider
      expect(result).toBe(12345);
      expect(provider.getProviderStatus().currentIndex).toBe(1);
    });

    it('should throw error after exhausting all retries', async () => {
      const provider = new FailoverProvider(config);
      
      // Make all providers fail
      mockProviders.forEach(p => {
        p.getBlockNumber.mockRejectedValue(new Error('Persistent error'));
      });
      
      await expect(provider.getBlockNumber()).rejects.toThrow('TestProvider: getBlockNumber failed after 3 attempts');
    });

    it('should not failover on non-network errors when autoFailover is false', async () => {
      const provider = new FailoverProvider({ ...config, autoFailover: false });
      
      mockProviders[0].getBlockNumber
        .mockRejectedValueOnce(new Error('Non-network error'))
        .mockResolvedValueOnce(12345);
      
      const result = await provider.getBlockNumber();
      
      expect(result).toBe(12345);
      expect(provider.getProviderStatus().currentIndex).toBe(0); // Should not switch
    });
  });

  describe('isNetworkError', () => {
    let provider: FailoverProvider;

    beforeEach(() => {
      provider = new FailoverProvider(config);
    });

    it('should identify network errors by message', () => {
      const networkErrors = [
        new Error('network error'),
        new Error('connection error'),
        new Error('timeout'),
        new Error('ECONNREFUSED'),
        new Error('socket hang up'),
        new Error('too many requests'),
      ];

      networkErrors.forEach(error => {
        expect((provider as any).isNetworkError(error)).toBe(true);
      });
    });

    it('should identify network errors by code', () => {
      const networkErrorCodes = [429, 502, 503, 504, 520, 521, 522, 523, 524];
      
      networkErrorCodes.forEach(code => {
        const error = { code, message: 'Error' };
        expect((provider as any).isNetworkError(error)).toBe(true);
      });

      const specialCodes = ['TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR'];
      specialCodes.forEach(code => {
        const error = { code, message: 'Error' };
        expect((provider as any).isNetworkError(error)).toBe(true);
      });
    });

    it('should not identify non-network errors', () => {
      const nonNetworkErrors = [
        new Error('Invalid input'),
        new Error('Validation error'),
        { code: 400, message: 'Bad request' },
        { code: 401, message: 'Unauthorized' },
      ];

      nonNetworkErrors.forEach(error => {
        expect((provider as any).isNetworkError(error)).toBe(false);
      });
    });
  });

  describe('provider methods delegation', () => {
    let provider: FailoverProvider;

    beforeEach(() => {
      provider = new FailoverProvider(config);
    });

    it('should delegate getBlock calls', async () => {
      const blockHash = '0x123';
      const mockBlock = { number: 12345, hash: blockHash };
      mockProviders[0].getBlock.mockResolvedValue(mockBlock);

      const result = await provider.getBlock(blockHash, true);

      expect(result).toBe(mockBlock);
      expect(mockProviders[0].getBlock).toHaveBeenCalledWith(blockHash, true);
    });

    it('should delegate getTransaction calls', async () => {
      const txHash = '0x456';
      const mockTx = { hash: txHash };
      mockProviders[0].getTransaction.mockResolvedValue(mockTx);

      const result = await provider.getTransaction(txHash);

      expect(result).toBe(mockTx);
      expect(mockProviders[0].getTransaction).toHaveBeenCalledWith(txHash);
    });

    it('should delegate getBalance calls', async () => {
      const address = '0x789';
      const balance = BigInt('1000000000000000000');
      mockProviders[0].getBalance.mockResolvedValue(balance);

      const result = await provider.getBalance(address, 'latest');

      expect(result).toBe(balance);
      expect(mockProviders[0].getBalance).toHaveBeenCalledWith(address, 'latest');
    });

    it('should delegate call method', async () => {
      const txRequest = { to: '0x123', data: '0x456' };
      const callResult = '0x789';
      mockProviders[0].call.mockResolvedValue(callResult);

      const result = await provider.call(txRequest, 'latest');

      expect(result).toBe(callResult);
      expect(mockProviders[0].call).toHaveBeenCalledWith({ ...txRequest, blockTag: 'latest' });
    });

    it('should delegate estimateGas calls', async () => {
      const txRequest = { to: '0x123', data: '0x456' };
      const gasEstimate = BigInt('21000');
      mockProviders[0].estimateGas.mockResolvedValue(gasEstimate);

      const result = await provider.estimateGas(txRequest);

      expect(result).toBe(gasEstimate);
      expect(mockProviders[0].estimateGas).toHaveBeenCalledWith(txRequest);
    });

    it('should delegate event handling methods', async () => {
      const event = 'block';
      const listener = jest.fn();

      await provider.on(event, listener);
      expect(mockProviders[0].on).toHaveBeenCalledWith(event, listener);

      await provider.off(event, listener);
      expect(mockProviders[0].off).toHaveBeenCalledWith(event, listener);

      await provider.removeAllListeners(event);
      expect(mockProviders[0].removeAllListeners).toHaveBeenCalledWith(event);
    });
  });

  describe('utility methods', () => {
    let provider: FailoverProvider;

    beforeEach(() => {
      provider = new FailoverProvider(config);
    });

    it('should test all providers connectivity', async () => {
      mockProviders[0].getBlockNumber.mockResolvedValue(12345);
      mockProviders[1].getBlockNumber.mockRejectedValue(new Error('Connection failed'));
      mockProviders[2].getBlockNumber.mockResolvedValue(12346);

      const results = await provider.testAllProviders();

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        url: 'http://rpc1.example.com',
        healthy: true,
        latency: expect.any(Number),
      });
      expect(results[1]).toEqual({
        url: 'http://rpc2.example.com',
        healthy: false,
        error: 'Connection failed',
      });
      expect(results[2]).toEqual({
        url: 'http://rpc3.example.com',
        healthy: true,
        latency: expect.any(Number),
      });
    });

    it('should find fastest provider', async () => {
      // Mock different response times
      mockProviders[0].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 100))
      );
      mockProviders[1].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 50))
      );
      mockProviders[2].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 200))
      );

      const fastestIndex = await provider.getFastestProvider();

      expect(fastestIndex).toBe(1); // Provider 1 should be fastest
    });

    it('should optimize to fastest provider', async () => {
      // Mock provider 2 as fastest
      mockProviders[0].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 100))
      );
      mockProviders[1].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 200))
      );
      mockProviders[2].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 50))
      );

      await provider.optimizeProvider();

      expect(provider.getProviderStatus().currentIndex).toBe(2);
    });

    it('should not switch if fastest provider is unhealthy', async () => {
      const status = provider.getProviderStatus();
      status.healthStatus[2] = false; // Mark fastest as unhealthy

      mockProviders[0].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 100))
      );
      mockProviders[1].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 200))
      );
      mockProviders[2].getBlockNumber.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(12345), 50))
      );

      await provider.optimizeProvider();

      expect(provider.getProviderStatus().currentIndex).toBe(0); // Should stay on current
    });
  });

  describe('sleep method', () => {
    it('should resolve after specified time', async () => {
      const provider = new FailoverProvider(config);
      const start = Date.now();
      
      await (provider as any).sleep(50);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
    });
  });
});