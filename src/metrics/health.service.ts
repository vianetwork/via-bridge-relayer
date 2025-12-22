import { ethers } from 'ethers';
import * as viaEthers from 'via-ethers';
import { relayerDataSource, graphDataSource } from '../database/typeorm.config';
import { FailoverProvider } from '../utils/failoverProvider';
import { TransactionService } from '../transaction/transaction.service';
import { log } from '../utils/logger';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface DatabaseHealthCheck {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ProviderHealthCheck {
  status: HealthStatus;
  blockNumber?: number;
  latencyMs?: number;
  error?: string;
}

export interface WorkerHealthCheck {
  name: string;
  running: boolean;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: HealthStatus;
      relayerDb: DatabaseHealthCheck;
      graphDb: DatabaseHealthCheck;
    };
    providers: {
      status: HealthStatus;
      ethereum: ProviderHealthCheck;
      via: ProviderHealthCheck;
    };
    workers: {
      status: HealthStatus;
      totalWorkers: number;
      runningWorkers: number;
      workers: WorkerHealthCheck[];
    };
  };
}

export interface LivenessResult {
  status: 'ok' | 'error';
  timestamp: string;
}

export interface ReadinessResult {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    providers: boolean;
  };
}

let healthServiceInstance: HealthService | null = null;

export class HealthService {
  private readonly startTime: number;
  private readonly version: string;
  private ethProvider: ethers.Provider | null = null;
  private viaProvider: viaEthers.Provider | null = null;
  private transactionService: TransactionService | null = null;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
    log.info('HealthService initialized');
  }

  public setProviders(
    ethProvider: ethers.Provider,
    viaProvider: viaEthers.Provider
  ): void {
    this.ethProvider = ethProvider;
    this.viaProvider = viaProvider;
  }

  public setTransactionService(transactionService: TransactionService): void {
    this.transactionService = transactionService;
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const [databaseHealth, providersHealth, workersHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkProvidersHealth(),
      this.checkWorkersHealth(),
    ]);

    const statuses = [
      databaseHealth.status,
      providersHealth.status,
      workersHealth.status,
    ];

    let overallStatus: HealthStatus = 'healthy';
    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: this.version,
      checks: {
        database: databaseHealth,
        providers: providersHealth,
        workers: workersHealth,
      },
    };
  }

  public async checkLiveness(): Promise<LivenessResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  public async checkReadiness(): Promise<ReadinessResult> {
    const timestamp = new Date().toISOString();

    // Check critical dependencies
    const [databaseReady, providersReady] = await Promise.all([
      this.isDatabaseReady(),
      this.areProvidersReady(),
    ]);

    return {
      ready: databaseReady && providersReady,
      timestamp,
      checks: {
        database: databaseReady,
        providers: providersReady,
      },
    };
  }

  private async checkDatabaseHealth(): Promise<{
    status: HealthStatus;
    relayerDb: DatabaseHealthCheck;
    graphDb: DatabaseHealthCheck;
  }> {
    const [relayerDb, graphDb] = await Promise.all([
      this.checkSingleDatabase('relayer', relayerDataSource),
      this.checkSingleDatabase('graph', graphDataSource),
    ]);

    let status: HealthStatus = 'healthy';
    if (!relayerDb.connected && !graphDb.connected) {
      status = 'unhealthy';
    } else if (!relayerDb.connected || !graphDb.connected) {
      status = 'degraded';
    }

    return { status, relayerDb, graphDb };
  }

  private async checkSingleDatabase(
    name: string,
    dataSource: typeof relayerDataSource
  ): Promise<DatabaseHealthCheck> {
    if (!dataSource.isInitialized) {
      return { connected: false, error: 'DataSource not initialized' };
    }

    const startTime = Date.now();
    try {
      await dataSource.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return { connected: true, latencyMs };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkProvidersHealth(): Promise<{
    status: HealthStatus;
    ethereum: ProviderHealthCheck;
    via: ProviderHealthCheck;
  }> {
    const [ethereum, via] = await Promise.all([
      this.checkSingleProvider('ethereum', this.ethProvider),
      this.checkSingleProvider('via', this.viaProvider),
    ]);

    let status: HealthStatus = 'healthy';
    if (ethereum.status === 'unhealthy' && via.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (ethereum.status === 'unhealthy' || via.status === 'unhealthy') {
      status = 'degraded';
    }

    return { status, ethereum, via };
  }

  private async checkSingleProvider(
    name: string,
    provider: ethers.Provider | viaEthers.Provider | null
  ): Promise<ProviderHealthCheck> {
    if (!provider) {
      return { status: 'unhealthy', error: 'Provider not configured' };
    }

    const startTime = Date.now();
    try {
      const blockNumber = await provider.getBlockNumber();
      const latencyMs = Date.now() - startTime;

      // If using FailoverProvider, get additional status
      if (provider instanceof FailoverProvider) {
        const providerStatus = provider.getProviderStatus();
        const healthyProviders = providerStatus.healthStatus.filter(Boolean).length;

        if (healthyProviders === 0) {
          return { status: 'unhealthy', blockNumber, latencyMs, error: 'No healthy providers' };
        } else if (healthyProviders < providerStatus.totalProviders) {
          return { status: 'degraded', blockNumber, latencyMs };
        }
      }

      return { status: 'healthy', blockNumber, latencyMs };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkWorkersHealth(): Promise<{
    status: HealthStatus;
    totalWorkers: number;
    runningWorkers: number;
    workers: WorkerHealthCheck[];
  }> {
    if (!this.transactionService) {
      return {
        status: 'unhealthy',
        totalWorkers: 0,
        runningWorkers: 0,
        workers: [],
      };
    }

    const workerStatuses = this.transactionService.getWorkerStatus();
    const totalWorkers = workerStatuses.length;
    const runningWorkers = workerStatuses.filter((w) => w.running).length;

    let status: HealthStatus = 'healthy';
    if (runningWorkers === 0) {
      status = 'unhealthy';
    } else if (runningWorkers < totalWorkers) {
      status = 'degraded';
    }

    return {
      status,
      totalWorkers,
      runningWorkers,
      workers: workerStatuses,
    };
  }

  private async isDatabaseReady(): Promise<boolean> {
    try {
      if (!relayerDataSource.isInitialized) {
        return false;
      }
      await relayerDataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async areProvidersReady(): Promise<boolean> {
    if (!this.ethProvider || !this.viaProvider) {
      return false;
    }

    try {
      await Promise.all([
        this.ethProvider.getBlockNumber(),
        this.viaProvider.getBlockNumber(),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

export function initHealthService(): HealthService {
  if (healthServiceInstance) {
    return healthServiceInstance;
  }
  healthServiceInstance = new HealthService();
  return healthServiceInstance;
}

export function getHealthService(): HealthService | null {
  return healthServiceInstance;
}
