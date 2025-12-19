import * as dotenv from 'dotenv';

// Load environment variables from .env file if it exists
const dotenvResult = dotenv.config();

/**
 * Comprehensive configuration class that loads and validates all environment variables
 * at startup, throwing errors immediately if required variables are missing
 */
export class AppConfig {
  // Network Configuration
  public readonly ethUrl: string;
  public readonly viaUrl: string;
  public readonly ethFallbackUrls: string[];
  public readonly viaFallbackUrls: string[];

  // Contract Addresses (Required)
  public readonly ethereumBridgeAddress: string;
  public readonly viaBridgeAddress: string;

  // Relayer Configuration (Required)
  public readonly relayerPrivateKey: string;

  // Worker Configuration
  public readonly workerPollingInterval: number;
  public readonly ethWaitBlockConfirmations: number;
  public readonly viaWaitBlockConfirmations: number;
  public readonly withdrawalFinalizationConfirmations: number;
  public readonly transactionBatchSize: number;
  public readonly refundInterval: number;
  public readonly ethStartingBlock: number;
  public readonly viaStartingBlock: number;
  public readonly pendingTxTimeoutMinutes: number;

  // L2 Gas Configuration
  public readonly l2GasPrice: bigint;
  public readonly l2GasLimit: bigint;
  public readonly l2GasPerPubdata: bigint;

  // Event Names
  public readonly ethBridgeInitiatedEvent: string;
  public readonly ethBridgeFinalizedEvent: string;
  public readonly viaBridgeInitiatedEvent: string;
  public readonly viaBridgeFinalizedEvent: string;

  // Relayer Database Configuration
  public readonly databaseUrl?: string;
  public readonly databaseHost: string;
  public readonly databasePort: number;
  public readonly databaseUser: string;
  public readonly databasePassword: string;
  public readonly databaseName: string;
  public readonly databaseConnectionPoolSize: number;
  public readonly databaseConnectionIdleTimeoutMs: number;

  // Graph Database Configuration (optional - falls back to relayer DB settings)
  public readonly graphDatabaseUrl?: string;
  public readonly graphDatabaseHost: string;
  public readonly graphDatabasePort: number;
  public readonly graphDatabaseUser: string;
  public readonly graphDatabasePassword: string;
  public readonly graphDatabaseName: string;
  public readonly graphDatabaseConnectionPoolSize: number;

  // Graph Database Schemas
  public readonly l1GraphSchema: string;
  public readonly l2GraphSchema: string;

  // The Graph API Configuration
  public readonly useTheGraphForL1: boolean;
  public readonly theGraphApiKey?: string;
  public readonly theGraphL1Endpoint?: string;
  public readonly theGraphRetryAttempts: number;
  public readonly theGraphRetryDelay: number;
  public readonly theGraphRequestTimeout: number;

  // Application Configuration
  public readonly nodeEnv: string;
  public readonly logLevel: string;
  public readonly enableFileLogging: boolean;

  // Metrics Configuration
  public readonly metricsEnabled: boolean;
  public readonly metricsPort: number;
  public readonly metricsPath: string;
  public readonly healthPath: string;
  public readonly metricsCollectionInterval: number;

  // Configuration metadata
  public readonly configSource: string;

  constructor() {
    // Determine configuration source for logging
    this.configSource = dotenvResult.parsed ? '.env file' : 'environment variables';

    try {
      // Network Configuration
      this.ethUrl = this.getString('ETH_URL', 'http://host.docker.internal:8545');
      this.viaUrl = this.getString('VIA_URL', 'http://host.docker.internal:8546');

      // Fallback URLs (comma-separated)
      this.ethFallbackUrls = this.getStringArray('ETH_FALLBACK_URLS', []);
      this.viaFallbackUrls = this.getStringArray('VIA_FALLBACK_URLS', []);

      // Contract Addresses (Required)
      this.ethereumBridgeAddress = this.getRequiredString('ETHEREUM_BRIDGE_ADDRESS');
      this.viaBridgeAddress = this.getRequiredString('VIA_BRIDGE_ADDRESS');

      // Relayer Configuration (Required)
      this.relayerPrivateKey = this.getRequiredString('RELAYER_PRIVATE_KEY');
      this.validatePrivateKey(this.relayerPrivateKey);

      // Worker Configuration
      this.workerPollingInterval = this.getNumber('WORKER_POLLING_INTERVAL', 5000);
      this.ethWaitBlockConfirmations = this.getNumber('ETH_WAIT_BLOCK_CONFIRMATIONS', 6);
      this.viaWaitBlockConfirmations = this.getNumber('VIA_WAIT_BLOCK_CONFIRMATIONS', 0);
      this.withdrawalFinalizationConfirmations = this.getNumber('WITHDRAWAL_FINALIZATION_CONFIRMATIONS', 12);
      this.transactionBatchSize = this.getNumber('TRANSACTION_BATCH_SIZE', 25);
      this.refundInterval = this.getNumber('REFUND_INTERVAL', 60000);
      this.ethStartingBlock = this.getNumber('ETH_STARTING_BLOCK', 0);
      this.viaStartingBlock = this.getNumber('VIA_STARTING_BLOCK', 0);
      this.pendingTxTimeoutMinutes = this.getNumber('PENDING_TX_TIMEOUT_MINUTES', 30);

      // L2 Gas Configuration (defaults are reasonable for Via L2)
      this.l2GasPrice = this.getBigInt('L2_GAS_PRICE', 1000n);
      this.l2GasLimit = this.getBigInt('L2_GAS_LIMIT', 500_000n);
      this.l2GasPerPubdata = this.getBigInt('L2_GAS_PER_PUBDATA', 800n);

      // Event Names
      this.ethBridgeInitiatedEvent = this.getString('ETH_BRIDGE_INITIATED_EVENT', 'BridgeInitiated');
      this.ethBridgeFinalizedEvent = this.getString('ETH_BRIDGE_FINALIZED_EVENT', 'BridgeFinalized');
      this.viaBridgeInitiatedEvent = this.getString('VIA_BRIDGE_INITIATED_EVENT', 'BridgeInitiated');
      this.viaBridgeFinalizedEvent = this.getString('VIA_BRIDGE_FINALIZED_EVENT', 'BridgeFinalized');

      // Relayer Database Configuration
      this.databaseUrl = this.getEnvVar('DATABASE_URL');
      this.databaseHost = this.getString('DATABASE_HOST', 'localhost');
      this.databasePort = this.getNumber('DATABASE_PORT', 5432);
      this.databaseUser = this.getString('DATABASE_USER', 'postgres');
      this.databasePassword = this.getString('DATABASE_PASSWORD', 'postgres');
      this.databaseName = this.getString('DATABASE_NAME', 'via_relayer');
      this.databaseConnectionPoolSize = this.getNumber('DATABASE_CONNECTION_POOL_SIZE', 100);
      this.databaseConnectionIdleTimeoutMs = this.getNumber('DATABASE_CONNECTION_IDLE_TIMEOUT_MS', 12000);

      // Graph Database Configuration (falls back to relayer DB settings if not provided)
      this.graphDatabaseUrl = this.getEnvVar('GRAPH_DATABASE_URL');
      this.graphDatabaseHost = this.getString('GRAPH_DATABASE_HOST', this.databaseHost);
      this.graphDatabasePort = this.getNumber('GRAPH_DATABASE_PORT', this.databasePort);
      this.graphDatabaseUser = this.getString('GRAPH_DATABASE_USER', this.databaseUser);
      this.graphDatabasePassword = this.getString('GRAPH_DATABASE_PASSWORD', this.databasePassword);
      this.graphDatabaseName = this.getString('GRAPH_DATABASE_NAME', this.databaseName);
      this.graphDatabaseConnectionPoolSize = this.getNumber('GRAPH_DATABASE_CONNECTION_POOL_SIZE', 50);

      // Graph Database Schemas
      this.l1GraphSchema = this.getString('L1_GRAPH_SCHEMA', 'sgd3');
      this.l2GraphSchema = this.getString('L2_GRAPH_SCHEMA', 'sgd2');

      // The Graph API Configuration
      this.useTheGraphForL1 = this.getBoolean('USE_THEGRAPH_FOR_L1', false);
      this.theGraphApiKey = this.getEnvVar('THEGRAPH_API_KEY');
      this.theGraphL1Endpoint = this.getEnvVar('THEGRAPH_L1_ENDPOINT');
      this.theGraphRetryAttempts = this.getNumber('THEGRAPH_RETRY_ATTEMPTS', 3);
      this.theGraphRetryDelay = this.getNumber('THEGRAPH_RETRY_DELAY', 1000);
      this.theGraphRequestTimeout = this.getNumber('THEGRAPH_REQUEST_TIMEOUT', 30000);

      // Application Configuration
      this.nodeEnv = this.getString('NODE_ENV', 'development');
      this.logLevel = this.getString('LOG_LEVEL', 'info');
      this.enableFileLogging = this.getBoolean('ENABLE_FILE_LOGGING', true);

      // Metrics Configuration
      this.metricsEnabled = this.getBoolean('METRICS_ENABLED', true);
      this.metricsPort = this.getNumber('METRICS_PORT', 9090);
      this.metricsPath = this.getString('METRICS_PATH', '/metrics');
      this.healthPath = this.getString('HEALTH_PATH', '/health');
      this.metricsCollectionInterval = this.getNumber('METRICS_COLLECTION_INTERVAL', 10000);

      // Validate configuration
      this.validateConfiguration();

    } catch (error) {
      // Only log to console in non-test environments to keep test output clean
      // Check for Jest environment or explicit test NODE_ENV
      const isTestEnvironment = process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined ||
        typeof (global as any).describe === 'function';

      if (!isTestEnvironment) {
        console.error('❌ Configuration validation failed:', error);
      }
      throw new Error(`Configuration Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get environment variable from either .env file or process.env
   */
  private getEnvVar(key: string): string | undefined {
    return dotenvResult.parsed?.[key] || process.env[key];
  }

  /**
   * Get string environment variable with optional default value
   */
  private getString(key: string, defaultValue?: string): string {
    const value = this.getEnvVar(key);
    if (value !== undefined) {
      return value;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }

  /**
   * Get required string environment variable (throws if not found)
   */
  private getRequiredString(key: string): string {
    const value = this.getEnvVar(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get number environment variable with optional default value
   */
  private getNumber(key: string, defaultValue?: number): number {
    const value = this.getEnvVar(key);
    if (value !== undefined) {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
      }
      return parsed;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }

  /**
   * Get bigint environment variable with optional default value
   */
  private getBigInt(key: string, defaultValue?: bigint): bigint {
    const value = this.getEnvVar(key);
    if (value !== undefined) {
      try {
        return BigInt(value);
      } catch {
        throw new Error(`Environment variable ${key} must be a valid bigint, got: ${value}`);
      }
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }

  /**
   * Get boolean environment variable with optional default value
   */
  private getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.getEnvVar(key);
    if (value !== undefined) {
      const lowercased = value.toLowerCase();
      if (lowercased === 'true' || lowercased === '1' || lowercased === 'yes') {
        return true;
      }
      if (lowercased === 'false' || lowercased === '0' || lowercased === 'no') {
        return false;
      }
      throw new Error(`Environment variable ${key} must be a valid boolean (true/false, 1/0, yes/no), got: ${value}`);
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }

  /**
   * Get string array environment variable (comma-separated) with optional default value
   */
  private getStringArray(key: string, defaultValue: string[] = []): string[] {
    const value = this.getEnvVar(key);
    if (!value || value.trim() === '') {
      return defaultValue;
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * Validate private key format
   */
  private validatePrivateKey(privateKey: string): void {
    if (!privateKey.startsWith('0x')) {
      throw new Error('RELAYER_PRIVATE_KEY must start with 0x');
    }
    if (privateKey.length !== 66) {
      throw new Error('RELAYER_PRIVATE_KEY must be 66 characters long (including 0x prefix)');
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error('RELAYER_PRIVATE_KEY must be a valid hexadecimal string');
    }
  }

  /**
   * Validate Ethereum addresses
   */
  private validateEthereumAddress(address: string, fieldName: string): void {
    if (!address.startsWith('0x')) {
      throw new Error(`${fieldName} must start with 0x`);
    }
    if (address.length !== 42) {
      throw new Error(`${fieldName} must be 42 characters long (including 0x prefix)`);
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`${fieldName} must be a valid Ethereum address`);
    }
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string, fieldName: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`${fieldName} must be a valid URL, got: ${url}`);
    }
  }

  /**
   * Additional configuration validation
   */
  private validateConfiguration(): void {
    // Validate Ethereum addresses
    this.validateEthereumAddress(this.ethereumBridgeAddress, 'ETHEREUM_BRIDGE_ADDRESS');
    this.validateEthereumAddress(this.viaBridgeAddress, 'VIA_BRIDGE_ADDRESS');

    // Validate URLs
    this.validateUrl(this.ethUrl, 'ETH_URL');
    this.validateUrl(this.viaUrl, 'VIA_URL');

    // Validate ranges
    if (this.workerPollingInterval < 1000) {
      throw new Error('WORKER_POLLING_INTERVAL must be at least 1000ms');
    }
    if (this.ethWaitBlockConfirmations < 0) {
      throw new Error('ETH_WAIT_BLOCK_CONFIRMATIONS must be at least 0');
    }
    if (this.viaWaitBlockConfirmations < 0) {
      throw new Error('VIA_WAIT_BLOCK_CONFIRMATIONS must be at least 0');
    }
    if (this.withdrawalFinalizationConfirmations < 1) {
      throw new Error('WITHDRAWAL_FINALIZATION_CONFIRMATIONS must be at least 1');
    }
    if (this.transactionBatchSize < 1 || this.transactionBatchSize > 100) {
      throw new Error('TRANSACTION_BATCH_SIZE must be between 1 and 100');
    }
    if (this.refundInterval < 10000) {
      throw new Error('REFUND_INTERVAL must be at least 10000ms (10 seconds)');
    }
    if (this.pendingTxTimeoutMinutes < 5) {
      throw new Error('PENDING_TX_TIMEOUT_MINUTES must be at least 5 minutes');
    }
    if (this.databasePort < 1 || this.databasePort > 65535) {
      throw new Error('DATABASE_PORT must be between 1 and 65535');
    }
    if (this.databaseConnectionPoolSize < 1 || this.databaseConnectionPoolSize > 1000) {
      throw new Error('DATABASE_CONNECTION_POOL_SIZE must be between 1 and 1000');
    }

    // Validate NODE_ENV
    const validNodeEnvs = ['development', 'production', 'test'];
    if (!validNodeEnvs.includes(this.nodeEnv)) {
      throw new Error(`NODE_ENV must be one of: ${validNodeEnvs.join(', ')}`);
    }

    // Validate LOG_LEVEL
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLogLevels.includes(this.logLevel)) {
      throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }

    // Validate metrics configuration
    if (this.metricsPort < 1 || this.metricsPort > 65535) {
      throw new Error('METRICS_PORT must be between 1 and 65535');
    }
    if (this.metricsCollectionInterval < 1000) {
      throw new Error('METRICS_COLLECTION_INTERVAL must be at least 1000ms');
    }

    // Validate The Graph configuration
    if (this.useTheGraphForL1) {
      if (!this.theGraphL1Endpoint) {
        throw new Error('THEGRAPH_L1_ENDPOINT is required when USE_THEGRAPH_FOR_L1 is enabled');
      }
      this.validateUrl(this.theGraphL1Endpoint, 'THEGRAPH_L1_ENDPOINT');
      if (this.theGraphRetryAttempts < 1 || this.theGraphRetryAttempts > 10) {
        throw new Error('THEGRAPH_RETRY_ATTEMPTS must be between 1 and 10');
      }
      if (this.theGraphRetryDelay < 100 || this.theGraphRetryDelay > 30000) {
        throw new Error('THEGRAPH_RETRY_DELAY must be between 100 and 30000ms');
      }
      if (this.theGraphRequestTimeout < 1000 || this.theGraphRequestTimeout > 120000) {
        throw new Error('THEGRAPH_REQUEST_TIMEOUT must be between 1000 and 120000ms');
      }
    }
  }

  /**
   * Get relayer database URL (either from env var or construct from components)
   */
  public getDatabaseUrl(): string {
    if (this.databaseUrl) {
      return this.databaseUrl;
    }
    return `postgres://${this.databaseUser}:${this.databasePassword}@${this.databaseHost}:${this.databasePort}/${this.databaseName}`;
  }

  /**
   * Get graph database URL (either from env var or construct from components)
   * Falls back to relayer database URL if no graph-specific config is provided
   */
  public getGraphDatabaseUrl(): string {
    if (this.graphDatabaseUrl) {
      return this.graphDatabaseUrl;
    }
    return `postgres://${this.graphDatabaseUser}:${this.graphDatabasePassword}@${this.graphDatabaseHost}:${this.graphDatabasePort}/${this.graphDatabaseName}`;
  }

  /**
   * Check if graph database is configured separately from relayer database
   */
  public isGraphDatabaseSeparate(): boolean {
    return !!(
      this.graphDatabaseUrl ||
      this.getEnvVar('GRAPH_DATABASE_HOST') ||
      this.getEnvVar('GRAPH_DATABASE_NAME')
    );
  }

  /**
   * Get a sanitized configuration object for logging (without sensitive data)
   */
  public getSanitizedConfig(): Record<string, any> {
    return {
      configSource: this.configSource,
      ethUrl: this.ethUrl,
      viaUrl: this.viaUrl,
      ethereumBridgeAddress: this.ethereumBridgeAddress,
      viaBridgeAddress: this.viaBridgeAddress,
      relayerPrivateKey: '***REDACTED***',
      workerPollingInterval: this.workerPollingInterval,
      ethWaitBlockConfirmations: this.ethWaitBlockConfirmations,
      viaWaitBlockConfirmations: this.viaWaitBlockConfirmations,
      withdrawalFinalizationConfirmations: this.withdrawalFinalizationConfirmations,
      transactionBatchSize: this.transactionBatchSize,
      refundInterval: this.refundInterval,
      ethStartingBlock: this.ethStartingBlock,
      viaStartingBlock: this.viaStartingBlock,
      pendingTxTimeoutMinutes: this.pendingTxTimeoutMinutes,
      l2GasPrice: this.l2GasPrice.toString(),
      l2GasLimit: this.l2GasLimit.toString(),
      l2GasPerPubdata: this.l2GasPerPubdata.toString(),
      ethBridgeInitiatedEvent: this.ethBridgeInitiatedEvent,
      ethBridgeFinalizedEvent: this.ethBridgeFinalizedEvent,
      viaBridgeInitiatedEvent: this.viaBridgeInitiatedEvent,
      viaBridgeFinalizedEvent: this.viaBridgeFinalizedEvent,
      databaseHost: this.databaseHost,
      databasePort: this.databasePort,
      databaseUser: this.databaseUser,
      databasePassword: '***REDACTED***',
      databaseName: this.databaseName,
      databaseConnectionPoolSize: this.databaseConnectionPoolSize,
      databaseConnectionIdleTimeoutMs: this.databaseConnectionIdleTimeoutMs,
      graphDatabaseHost: this.graphDatabaseHost,
      graphDatabasePort: this.graphDatabasePort,
      graphDatabaseUser: this.graphDatabaseUser,
      graphDatabasePassword: '***REDACTED***',
      graphDatabaseName: this.graphDatabaseName,
      graphDatabaseConnectionPoolSize: this.graphDatabaseConnectionPoolSize,
      isGraphDatabaseSeparate: this.isGraphDatabaseSeparate(),
      l1GraphSchema: this.l1GraphSchema,
      l2GraphSchema: this.l2GraphSchema,
      useTheGraphForL1: this.useTheGraphForL1,
      theGraphApiKey: this.theGraphApiKey ? '***REDACTED***' : undefined,
      theGraphL1Endpoint: this.theGraphL1Endpoint,
      theGraphRetryAttempts: this.theGraphRetryAttempts,
      theGraphRetryDelay: this.theGraphRetryDelay,
      theGraphRequestTimeout: this.theGraphRequestTimeout,
      nodeEnv: this.nodeEnv,
      logLevel: this.logLevel,
      enableFileLogging: this.enableFileLogging,
      metricsEnabled: this.metricsEnabled,
      metricsPort: this.metricsPort,
      metricsPath: this.metricsPath,
      healthPath: this.healthPath,
      metricsCollectionInterval: this.metricsCollectionInterval,
    };
  }
}

// Create and export a singleton instance
export const appConfig = new AppConfig();

// Export legacy functions for backward compatibility (will be deprecated)
export const config = dotenvResult;
export const getEnvVar = (key: string): string | undefined => {
  return dotenvResult.parsed?.[key] || process.env[key];
};
export const getEnvString = (key: string, defaultValue: string): string => {
  return getEnvVar(key) || defaultValue;
};
export const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  return value ? Number(value) : defaultValue;
};
export const getRequiredEnvVar = (key: string): string => {
  const value = getEnvVar(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}; 