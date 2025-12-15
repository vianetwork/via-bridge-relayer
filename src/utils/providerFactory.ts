import { ethers } from 'ethers';
import { FailoverProvider, FailoverProviderConfig } from './failoverProvider';
import { log } from './logger';

/**
 * Factory for creating providers with failover capabilities
 */
export class ProviderFactory {
  /**
   * Create a failover provider from multiple RPC URLs
   */
  static createFailoverProvider(
    rpcUrls: string[],
    options: Partial<FailoverProviderConfig> = {}
  ): FailoverProvider {
    const config: FailoverProviderConfig = {
      rpcUrls,
      maxRetries: 3,
      retryDelay: 1000,
      requestTimeout: 30000,
      autoFailover: true,
      ...options
    };
    
    return new FailoverProvider(config);
  }
  
  /**
   * Create a failover provider from a comma-separated string of URLs
   */
  static createFromUrlString(
    urlString: string,
    options: Partial<FailoverProviderConfig> = {}
  ): FailoverProvider {
    const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);
    
    if (urls.length === 0) {
      throw new Error('No valid RPC URLs provided');
    }
    
    if (urls.length === 1) {
      log.warn('Only one RPC URL provided, failover capabilities will be limited');
    }
    
    return this.createFailoverProvider(urls, options);
  }
  
  /**
   * Create a provider with automatic fallback configuration
   * Falls back to standard JsonRpcProvider if only one URL is provided
   */
  static createOptimalProvider(
    primaryUrl: string,
    fallbackUrls: string[] = [],
    options: Partial<FailoverProviderConfig> = {}
  ): ethers.Provider {
    const allUrls = [primaryUrl, ...fallbackUrls].filter(url => url && url.trim().length > 0);
    
    if (allUrls.length === 1) {
      log.info(`Creating standard JsonRpcProvider for: ${primaryUrl}`);
      return new ethers.JsonRpcProvider(primaryUrl);
    }
    
    log.info(`Creating FailoverProvider with ${allUrls.length} endpoints`);
    return this.createFailoverProvider(allUrls, options);
  }
  
  /**
   * Create providers from environment-based configuration
   */
  static createFromConfig(config: {
    primary: string;
    fallbacks?: string[];
    name?: string;
    maxRetries?: number;
    retryDelay?: number;
    requestTimeout?: number;
  }): ethers.Provider {
    return this.createOptimalProvider(
      config.primary,
      config.fallbacks || [],
      {
        name: config.name,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        requestTimeout: config.requestTimeout
      }
    );
  }
}

/**
 * Enhanced wallet that works with failover providers
 */
export class FailoverWallet extends ethers.Wallet {
  constructor(
    privateKey: string,
    provider?: ethers.Provider
  ) {
    super(privateKey, provider);
  }
  
  /**
   * Get provider status if using a FailoverProvider
   */
  getProviderStatus() {
    if (this.provider && this.provider instanceof FailoverProvider) {
      return this.provider.getProviderStatus();
    }
    return null;
  }
  
  /**
   * Test all provider endpoints if using a FailoverProvider
   */
  async testProviderHealth() {
    if (this.provider && this.provider instanceof FailoverProvider) {
      return await this.provider.testAllProviders();
    }
    return null;
  }
  
  /**
   * Optimize to fastest provider if using a FailoverProvider
   */
  async optimizeProvider() {
    if (this.provider && this.provider instanceof FailoverProvider) {
      await this.provider.optimizeProvider();
    }
  }
}