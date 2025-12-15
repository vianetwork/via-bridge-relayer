import { ethers } from 'ethers';
import { ProviderFactory, FailoverWallet } from '../../src/utils/providerFactory';
import { FailoverProvider } from '../../src/utils/failoverProvider';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation((url) => ({
      url,
      isJsonRpcProvider: true,
    })),
    Wallet: class MockWallet {
      constructor(public privateKey: string, public provider?: any) {}
    },
  },
}));

// Mock FailoverProvider
jest.mock('../../src/utils/failoverProvider', () => ({
  FailoverProvider: jest.fn().mockImplementation((config) => ({
    config,
    isFailoverProvider: true,
    getProviderStatus: jest.fn().mockReturnValue({
      currentIndex: 0,
      currentUrl: config.rpcUrls[0],
      totalProviders: config.rpcUrls.length,
    }),
    testAllProviders: jest.fn().mockResolvedValue([]),
    optimizeProvider: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-setup mock implementations after clearing
    (ethers.JsonRpcProvider as jest.Mock).mockImplementation((url) => ({
      url,
      isJsonRpcProvider: true,
    }));
    
    (FailoverProvider as jest.Mock).mockImplementation((config) => ({
      config,
      isFailoverProvider: true,
      getProviderStatus: jest.fn().mockReturnValue({
        currentIndex: 0,
        currentUrl: config.rpcUrls[0],
        totalProviders: config.rpcUrls.length,
      }),
      testAllProviders: jest.fn().mockResolvedValue([]),
      optimizeProvider: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('createFailoverProvider', () => {
    it('should create FailoverProvider with default options', () => {
      const urls = ['http://rpc1.com', 'http://rpc2.com'];
      
      const provider = ProviderFactory.createFailoverProvider(urls);
      
      expect(FailoverProvider).toHaveBeenCalledWith({
        rpcUrls: urls,
        maxRetries: 3,
        retryDelay: 1000,
        requestTimeout: 30000,
        autoFailover: true,
      });
      expect((provider as any).isFailoverProvider).toBe(true);
    });

    it('should create FailoverProvider with custom options', () => {
      const urls = ['http://rpc1.com', 'http://rpc2.com'];
      const options = {
        maxRetries: 5,
        retryDelay: 2000,
        requestTimeout: 60000,
        autoFailover: false,
        name: 'CustomProvider',
      };
      
      const provider = ProviderFactory.createFailoverProvider(urls, options);
      
      expect(FailoverProvider).toHaveBeenCalledWith({
        rpcUrls: urls,
        maxRetries: 5,
        retryDelay: 2000,
        requestTimeout: 60000,
        autoFailover: false,
        name: 'CustomProvider',
      });
    });

    it('should override only specified options', () => {
      const urls = ['http://rpc1.com'];
      const options = { maxRetries: 10 };
      
      ProviderFactory.createFailoverProvider(urls, options);
      
      expect(FailoverProvider).toHaveBeenCalledWith({
        rpcUrls: urls,
        maxRetries: 10,
        retryDelay: 1000,
        requestTimeout: 30000,
        autoFailover: true,
      });
    });
  });

  describe('createFromUrlString', () => {
    it('should parse comma-separated URLs', () => {
      const urlString = 'http://rpc1.com,http://rpc2.com,http://rpc3.com';
      
      const provider = ProviderFactory.createFromUrlString(urlString);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: ['http://rpc1.com', 'http://rpc2.com', 'http://rpc3.com'],
        })
      );
    });

    it('should handle URLs with whitespace', () => {
      const urlString = ' http://rpc1.com , http://rpc2.com , http://rpc3.com ';
      
      const provider = ProviderFactory.createFromUrlString(urlString);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: ['http://rpc1.com', 'http://rpc2.com', 'http://rpc3.com'],
        })
      );
    });

    it('should filter out empty URLs', () => {
      const urlString = 'http://rpc1.com,,http://rpc2.com,';
      
      const provider = ProviderFactory.createFromUrlString(urlString);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: ['http://rpc1.com', 'http://rpc2.com'],
        })
      );
    });

    it('should throw error for empty URL string', () => {
      expect(() => ProviderFactory.createFromUrlString('')).toThrow('No valid RPC URLs provided');
      expect(() => ProviderFactory.createFromUrlString(' , , ')).toThrow('No valid RPC URLs provided');
    });

    it('should warn when only one URL is provided', () => {
      const { log } = require('../../src/utils/logger');
      
      ProviderFactory.createFromUrlString('http://rpc1.com');
      
      expect(log.warn).toHaveBeenCalledWith('Only one RPC URL provided, failover capabilities will be limited');
    });

    it('should pass options to createFailoverProvider', () => {
      const urlString = 'http://rpc1.com,http://rpc2.com';
      const options = { maxRetries: 5, name: 'TestProvider' };
      
      ProviderFactory.createFromUrlString(urlString, options);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 5,
          name: 'TestProvider',
        })
      );
    });
  });

  describe('createOptimalProvider', () => {
    it('should create JsonRpcProvider for single URL', () => {
      const { log } = require('../../src/utils/logger');
      const primaryUrl = 'http://rpc1.com';
      
      const provider = ProviderFactory.createOptimalProvider(primaryUrl);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(primaryUrl);
      expect((provider as any).isJsonRpcProvider).toBe(true);
      expect(log.info).toHaveBeenCalledWith('Creating standard JsonRpcProvider for: http://rpc1.com');
    });

    it('should create FailoverProvider for multiple URLs', () => {
      const { log } = require('../../src/utils/logger');
      const primaryUrl = 'http://rpc1.com';
      const fallbackUrls = ['http://rpc2.com', 'http://rpc3.com'];
      
      const provider = ProviderFactory.createOptimalProvider(primaryUrl, fallbackUrls);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: [primaryUrl, ...fallbackUrls],
        })
      );
      expect((provider as any).isFailoverProvider).toBe(true);
      expect(log.info).toHaveBeenCalledWith('Creating FailoverProvider with 3 endpoints');
    });

    it('should filter out empty fallback URLs', () => {
      const primaryUrl = 'http://rpc1.com';
      const fallbackUrls = ['http://rpc2.com', '', '  ', 'http://rpc3.com'];
      
      ProviderFactory.createOptimalProvider(primaryUrl, fallbackUrls);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: ['http://rpc1.com', 'http://rpc2.com', 'http://rpc3.com'],
        })
      );
    });

    it('should create JsonRpcProvider when all fallbacks are empty', () => {
      const primaryUrl = 'http://rpc1.com';
      const fallbackUrls = ['', '  ', null as any, undefined as any];
      
      const provider = ProviderFactory.createOptimalProvider(primaryUrl, fallbackUrls);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(primaryUrl);
      expect((provider as any).isJsonRpcProvider).toBe(true);
    });

    it('should pass options to FailoverProvider', () => {
      const primaryUrl = 'http://rpc1.com';
      const fallbackUrls = ['http://rpc2.com'];
      const options = { maxRetries: 5, name: 'OptimalProvider' };
      
      ProviderFactory.createOptimalProvider(primaryUrl, fallbackUrls, options);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 5,
          name: 'OptimalProvider',
        })
      );
    });
  });

  describe('createFromConfig', () => {
    it('should create provider with minimal config', () => {
      const config = { primary: 'http://rpc1.com' };
      
      ProviderFactory.createFromConfig(config);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://rpc1.com');
    });

    it('should create FailoverProvider with fallbacks', () => {
      const config = {
        primary: 'http://rpc1.com',
        fallbacks: ['http://rpc2.com', 'http://rpc3.com'],
      };
      
      ProviderFactory.createFromConfig(config);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrls: ['http://rpc1.com', 'http://rpc2.com', 'http://rpc3.com'],
        })
      );
    });

    it('should pass all config options', () => {
      const config = {
        primary: 'http://rpc1.com',
        fallbacks: ['http://rpc2.com'],
        name: 'ConfigProvider',
        maxRetries: 10,
        retryDelay: 5000,
        requestTimeout: 120000,
      };
      
      ProviderFactory.createFromConfig(config);
      
      expect(FailoverProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ConfigProvider',
          maxRetries: 10,
          retryDelay: 5000,
          requestTimeout: 120000,
        })
      );
    });

    it('should handle undefined fallbacks', () => {
      const config = {
        primary: 'http://rpc1.com',
        name: 'TestProvider',
      };
      
      ProviderFactory.createFromConfig(config);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('http://rpc1.com');
    });
  });
});

describe('FailoverWallet', () => {
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = {
      isFailoverProvider: true,
      constructor: FailoverProvider,
      getProviderStatus: jest.fn().mockReturnValue({
        currentIndex: 1,
        currentUrl: 'http://rpc2.com',
        totalProviders: 3,
      }),
      testAllProviders: jest.fn().mockResolvedValue([
        { url: 'http://rpc1.com', healthy: true },
        { url: 'http://rpc2.com', healthy: true },
        { url: 'http://rpc3.com', healthy: false },
      ]),
      optimizeProvider: jest.fn().mockResolvedValue(undefined),
    };
    
    // Set up the prototype chain to make instanceof work
    Object.setPrototypeOf(mockProvider, FailoverProvider.prototype);
  });

  describe('constructor', () => {
    it('should create wallet with private key and provider', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey, mockProvider);
      
      expect(wallet.privateKey).toBe(privateKey);
      expect(wallet.provider).toBe(mockProvider);
    });

    it('should create wallet without provider', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey);
      
      expect(wallet.privateKey).toBe(privateKey);
      expect(wallet.provider).toBeUndefined();
    });
  });

  describe('getProviderStatus', () => {
    it('should return provider status for FailoverProvider', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey, mockProvider);
      
      const status = wallet.getProviderStatus();
      
      expect(status).toEqual({
        currentIndex: 1,
        currentUrl: 'http://rpc2.com',
        totalProviders: 3,
      });
      expect(mockProvider.getProviderStatus).toHaveBeenCalled();
    });

    it('should return null for non-FailoverProvider', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const regularProvider = { isRegularProvider: true } as any;
      
      const wallet = new FailoverWallet(privateKey, regularProvider);
      
      const status = wallet.getProviderStatus();
      
      expect(status).toBeNull();
    });

    it('should return null when no provider', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey);
      
      const status = wallet.getProviderStatus();
      
      expect(status).toBeNull();
    });
  });

  describe('testProviderHealth', () => {
    it('should test provider health for FailoverProvider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      mockProvider.constructor = FailoverProvider;
      
      const wallet = new FailoverWallet(privateKey, mockProvider);
      
      const health = await wallet.testProviderHealth();
      
      expect(health).toEqual([
        { url: 'http://rpc1.com', healthy: true },
        { url: 'http://rpc2.com', healthy: true },
        { url: 'http://rpc3.com', healthy: false },
      ]);
      expect(mockProvider.testAllProviders).toHaveBeenCalled();
    });

    it('should return null for non-FailoverProvider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const regularProvider = { isRegularProvider: true } as any;
      
      const wallet = new FailoverWallet(privateKey, regularProvider);
      
      const health = await wallet.testProviderHealth();
      
      expect(health).toBeNull();
    });

    it('should return null when no provider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey);
      
      const health = await wallet.testProviderHealth();
      
      expect(health).toBeNull();
    });
  });

  describe('optimizeProvider', () => {
    it('should optimize provider for FailoverProvider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      mockProvider.constructor = FailoverProvider;
      
      const wallet = new FailoverWallet(privateKey, mockProvider);
      
      await wallet.optimizeProvider();
      
      expect(mockProvider.optimizeProvider).toHaveBeenCalled();
    });

    it('should do nothing for non-FailoverProvider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const regularProvider = { isRegularProvider: true } as any;
      
      const wallet = new FailoverWallet(privateKey, regularProvider);
      
      await wallet.optimizeProvider();
      
      // Should not throw or call anything
    });

    it('should do nothing when no provider', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      const wallet = new FailoverWallet(privateKey);
      
      await wallet.optimizeProvider();
      
      // Should not throw
    });
  });

  describe('instanceof checks', () => {
    it('should correctly identify FailoverProvider instances', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      // Mock instanceof check
      Object.setPrototypeOf(mockProvider, FailoverProvider.prototype);
      
      const wallet = new FailoverWallet(privateKey, mockProvider);
      
      const status = wallet.getProviderStatus();
      expect(status).toBeTruthy();
    });
  });
});