import { ethers } from 'ethers';
import { log } from './logger';

export interface FailoverProviderConfig {
  /** Array of RPC URLs to failover between */
  rpcUrls: string[];
  /** Maximum number of retry attempts per RPC URL (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Timeout for each RPC request in milliseconds (default: 30000) */
  requestTimeout?: number;
  /** Whether to automatically cycle through providers on errors (default: true) */
  autoFailover?: boolean;
  /** Name for logging purposes */
  name?: string;
}

/**
 * A robust ethers provider that automatically fails over to different RPC URLs
 * when the current provider encounters connection issues or errors.
 * 
 * This provider maintains full compatibility with ethers.Provider and can be used
 * as a drop-in replacement for JsonRpcProvider while providing enhanced reliability.
 */
export class FailoverProvider extends ethers.AbstractProvider {
  private providers: ethers.JsonRpcProvider[] = [];
  private rpcUrls: string[] = [];
  private currentProviderIndex: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private requestTimeout: number;
  private autoFailover: boolean;
  private name: string;
  private healthStatus: boolean[] = [];
  private lastFailoverTime: number = 0;
  
  constructor(config: FailoverProviderConfig) {
    super();
    
    if (!config.rpcUrls || config.rpcUrls.length === 0) {
      throw new Error('At least one RPC URL must be provided');
    }
    
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.requestTimeout = config.requestTimeout ?? 30000;
    this.autoFailover = config.autoFailover ?? true;
    this.name = config.name ?? 'FailoverProvider';
    
    // Store URLs for reference
    this.rpcUrls = [...config.rpcUrls];
    
    this.providers = config.rpcUrls.map((url, index) => {
      const provider = new ethers.JsonRpcProvider(url, undefined, {
        staticNetwork: true,
      });
      
      provider.pollingInterval = 4000;
      
      return provider;
    });
    
    this.healthStatus = new Array(this.providers.length).fill(true);
    
    log.info(`${this.name}: Initialized with ${this.providers.length} RPC endpoints`);
  }
  
  /**
   * Get the currently active provider
   */
  get currentProvider(): ethers.JsonRpcProvider {
    return this.providers[this.currentProviderIndex];
  }
  
  /**
   * Get information about current provider status
   */
  getProviderStatus() {
    return {
      currentIndex: this.currentProviderIndex,
      currentUrl: this.rpcUrls[this.currentProviderIndex] || 'unknown',
      totalProviders: this.providers.length,
      healthStatus: this.healthStatus,
      name: this.name
    };
  }
  
  /**
   * Manually switch to the next provider
   */
  switchToNextProvider(): boolean {
    const previousIndex = this.currentProviderIndex;
    
    // Find next healthy provider
    for (let i = 1; i <= this.providers.length; i++) {
      const nextIndex = (this.currentProviderIndex + i) % this.providers.length;
      if (this.healthStatus[nextIndex]) {
        this.currentProviderIndex = nextIndex;
        this.lastFailoverTime = Date.now();
        log.warn(`${this.name}: Switched from provider ${previousIndex} to ${nextIndex}`);
        return true;
      }
    }
    
    // If no healthy providers, reset all to healthy and use next
    log.error(`${this.name}: All providers marked unhealthy, resetting status`);
    this.healthStatus.fill(true);
    this.currentProviderIndex = (previousIndex + 1) % this.providers.length;
    this.lastFailoverTime = Date.now();
    
    return false;
  }
  
  /**
   * Mark current provider as unhealthy
   */
  private markCurrentProviderUnhealthy() {
    this.healthStatus[this.currentProviderIndex] = false;
    log.warn(`${this.name}: Marked provider ${this.currentProviderIndex} as unhealthy`);
  }
  
  /**
   * Execute a provider method with automatic failover
   */
  private async executeWithFailover<T>(
    methodName: string,
    method: (provider: ethers.JsonRpcProvider) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${this.requestTimeout}ms`));
          }, this.requestTimeout);
        });
        
        // Race between the actual request and timeout
        const result = await Promise.race([
          method(this.currentProvider),
          timeoutPromise
        ]);
        
        // Mark provider as healthy on success
        this.healthStatus[this.currentProviderIndex] = true;
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        const isNetworkError = this.isNetworkError(error);
        const shouldFailover = this.autoFailover && isNetworkError;
        
        log.warn(
          `${this.name}: ${methodName} failed on provider ${this.currentProviderIndex} ` +
          `(attempt ${attempt + 1}/${this.maxRetries}): ${lastError.message}`
        );
        
        if (shouldFailover) {
          this.markCurrentProviderUnhealthy();
          
          // Try to switch to next provider
          const switched = this.switchToNextProvider();
          if (!switched && attempt === this.maxRetries - 1) {
            break; // No more healthy providers and max retries reached
          }
        } else if (attempt < this.maxRetries - 1) {
          // Wait before retrying with same provider
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    throw new Error(
      `${this.name}: ${methodName} failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }
  
  /**
   * Check if an error is a network/connection error that should trigger failover
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    
    // Network related errors
    const networkErrors = [
      'network error',
      'connection error',
      'timeout',
      'econnrefused',
      'enotfound',
      'enetunreach',
      'ehostunreach',
      'socket hang up',
      'request timeout',
      'too many requests',
      'service unavailable',
      'bad gateway',
      'gateway timeout'
    ];
    
    // HTTP status codes that should trigger failover
    const failoverCodes = [429, 502, 503, 504, 520, 521, 522, 523, 524];
    
    return networkErrors.some(errText => errorMessage.includes(errText)) ||
           failoverCodes.includes(errorCode) ||
           errorCode === 'TIMEOUT' ||
           errorCode === 'NETWORK_ERROR' ||
           errorCode === 'SERVER_ERROR';
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Override key ethers.Provider methods to use failover logic
  
  async getBlockNumber(): Promise<number> {
    return this.executeWithFailover('getBlockNumber', (provider) => provider.getBlockNumber());
  }
  
  async getBlock(blockHashOrBlockTag: string | number, prefetchTxs?: boolean): Promise<ethers.Block | null> {
    return this.executeWithFailover('getBlock', (provider) => provider.getBlock(blockHashOrBlockTag, prefetchTxs));
  }
  
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    return this.executeWithFailover('getTransaction', (provider) => provider.getTransaction(txHash));
  }
  
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return this.executeWithFailover('getTransactionReceipt', (provider) => provider.getTransactionReceipt(txHash));
  }
  
  async getBalance(address: string, blockTag?: ethers.BlockTag): Promise<bigint> {
    return this.executeWithFailover('getBalance', (provider) => provider.getBalance(address, blockTag));
  }
  
  async getCode(address: string, blockTag?: ethers.BlockTag): Promise<string> {
    return this.executeWithFailover('getCode', (provider) => provider.getCode(address, blockTag));
  }
  
  async getStorage(address: string, position: ethers.BigNumberish, blockTag?: ethers.BlockTag): Promise<string> {
    return this.executeWithFailover('getStorage', (provider) => provider.getStorage(address, position, blockTag));
  }
  
  async getStorageAt(address: string, position: ethers.BigNumberish, blockTag?: ethers.BlockTag): Promise<string> {
    return this.getStorage(address, position, blockTag);
  }
  
  async call(transaction: ethers.TransactionRequest, blockTag?: ethers.BlockTag): Promise<string> {
    const txRequest = blockTag ? { ...transaction, blockTag } : transaction;
    return this.executeWithFailover('call', (provider) => provider.call(txRequest));
  }
  
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    return this.executeWithFailover('estimateGas', (provider) => provider.estimateGas(transaction));
  }
  
  async broadcastTransaction(signedTransaction: string): Promise<ethers.TransactionResponse> {
    return this.executeWithFailover('broadcastTransaction', (provider) => provider.broadcastTransaction(signedTransaction));
  }
  
  async getLogs(filter: ethers.Filter | ethers.FilterByBlockHash): Promise<ethers.Log[]> {
    return this.executeWithFailover('getLogs', (provider) => provider.getLogs(filter));
  }
  
  async getNetwork(): Promise<ethers.Network> {
    return this.executeWithFailover('getNetwork', (provider) => provider.getNetwork());
  }
  
  async getFeeData(): Promise<ethers.FeeData> {
    return this.executeWithFailover('getFeeData', (provider) => provider.getFeeData());
  }
  
  async getTransactionCount(address: string, blockTag?: ethers.BlockTag): Promise<number> {
    return this.executeWithFailover('getTransactionCount', (provider) => provider.getTransactionCount(address, blockTag));
  }
  
  // Event handling methods
  async on(event: ethers.ProviderEvent, listener: ethers.Listener): Promise<this> {
    // Forward to current provider
    this.currentProvider.on(event, listener);
    return this;
  }
  
  async off(event: ethers.ProviderEvent, listener?: ethers.Listener): Promise<this> {
    // Forward to current provider
    this.currentProvider.off(event, listener);
    return this;
  }
  
  async removeAllListeners(event?: ethers.ProviderEvent): Promise<this> {
    // Forward to current provider
    this.currentProvider.removeAllListeners(event);
    return this;
  }
  
  // Make it compatible with contract creation and wallet connection
  async _detectNetwork(): Promise<ethers.Network> {
    return this.executeWithFailover('_detectNetwork', (provider) => provider._detectNetwork());
  }
  
  async detectNetwork(): Promise<ethers.Network> {
    return this._detectNetwork();
  }
  
  // Method to perform a custom RPC call
  async send(method: string, params: Array<any>): Promise<any> {
    return this.executeWithFailover('send', (provider) => provider.send(method, params));
  }
  
  // Additional utility methods
  
  /**
   * Test connectivity to all providers and return their status
   */
  async testAllProviders(): Promise<{url: string, healthy: boolean, latency?: number, error?: string}[]> {
    const results = await Promise.allSettled(
      this.providers.map(async (provider, index) => {
        const startTime = Date.now();
        try {
          await provider.getBlockNumber();
          const latency = Date.now() - startTime;
          return {
            url: this.rpcUrls[index] || `Provider ${index}`,
            healthy: true,
            latency
          };
        } catch (error) {
          return {
            url: this.rpcUrls[index] || `Provider ${index}`,
            healthy: false,
            error: (error as Error).message
          };
        }
      })
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: this.rpcUrls[index] || `Provider ${index}`,
          healthy: false,
          error: result.reason.message
        };
      }
    });
  }
  
  /**
   * Get the fastest responding provider
   */
  async getFastestProvider(): Promise<number> {
    const testPromises = this.providers.map(async (provider, index) => {
      const startTime = Date.now();
      try {
        await provider.getBlockNumber();
        return { index, latency: Date.now() - startTime };
      } catch {
        return { index, latency: Infinity };
      }
    });
    
    const results = await Promise.all(testPromises);
    const fastest = results.reduce((prev, curr) => 
      curr.latency < prev.latency ? curr : prev
    );
    
    return fastest.index;
  }
  
  /**
   * Switch to the fastest provider
   */
  async optimizeProvider(): Promise<void> {
    const fastestIndex = await this.getFastestProvider();
    if (fastestIndex !== this.currentProviderIndex && this.healthStatus[fastestIndex]) {
      this.currentProviderIndex = fastestIndex;
      log.info(`${this.name}: Optimized to fastest provider ${fastestIndex}`);
    }
  }
}