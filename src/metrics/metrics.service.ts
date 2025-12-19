import * as client from 'prom-client';
import { TransactionRepository } from '../database/transaction.repository';
import { appConfig } from '../utils/config';
import { log } from '../utils/logger';

export interface MetricsServiceConfig {
  transactionRepository: TransactionRepository;
  collectionInterval?: number;
}

let metricsServiceInstance: MetricsService | null = null;

export class MetricsService {
  private readonly transactionRepository: TransactionRepository;
  private readonly collectionInterval: number;
  private collectionTimer: ReturnType<typeof setInterval> | null = null;
  private readonly startTime: number;

  // Gauges
  public readonly transactionsTotal: client.Gauge<string>;
  public readonly transactionsByStatus: client.Gauge<string>;
  public readonly pendingTransactions: client.Gauge<string>;
  public readonly avgProcessingTimeSeconds: client.Gauge<string>;
  public readonly uptimeSeconds: client.Gauge<string>;

  // Counters
  public readonly transactionsProcessedTotal: client.Counter<string>;
  public readonly transactionsFailedTotal: client.Counter<string>;
  public readonly batchesProcessedTotal: client.Counter<string>;

  // Histograms
  public readonly transactionProcessingDuration: client.Histogram<string>;
  public readonly batchSize: client.Histogram<string>;

  constructor(config: MetricsServiceConfig) {
    this.transactionRepository = config.transactionRepository;
    this.collectionInterval = config.collectionInterval ?? appConfig.metricsCollectionInterval;
    this.startTime = Date.now();

    // Clear default metrics and register new ones
    client.register.clear();

    // Collect default Node.js metrics
    client.collectDefaultMetrics({ register: client.register });

    // Initialize gauges
    this.transactionsTotal = new client.Gauge({
      name: 'relayer_transactions_total',
      help: 'Total number of transactions in the database',
    });

    this.transactionsByStatus = new client.Gauge({
      name: 'relayer_transactions_by_status',
      help: 'Number of transactions by status',
      labelNames: ['status'],
    });

    this.pendingTransactions = new client.Gauge({
      name: 'relayer_pending_transactions',
      help: 'Current number of pending transactions',
    });

    this.avgProcessingTimeSeconds = new client.Gauge({
      name: 'relayer_avg_processing_time_seconds',
      help: 'Average transaction processing time in seconds',
    });

    this.uptimeSeconds = new client.Gauge({
      name: 'relayer_uptime_seconds',
      help: 'Relayer uptime in seconds',
    });

    // Initialize counters
    this.transactionsProcessedTotal = new client.Counter({
      name: 'relayer_transactions_processed_total',
      help: 'Total number of successfully processed transactions',
    });

    this.transactionsFailedTotal = new client.Counter({
      name: 'relayer_transactions_failed_total',
      help: 'Total number of failed transactions',
    });

    this.batchesProcessedTotal = new client.Counter({
      name: 'relayer_batches_processed_total',
      help: 'Total number of batches processed',
    });

    // Initialize histograms
    this.transactionProcessingDuration = new client.Histogram({
      name: 'relayer_transaction_processing_duration_seconds',
      help: 'Transaction processing duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    });

    this.batchSize = new client.Histogram({
      name: 'relayer_batch_size',
      help: 'Number of transactions per batch',
      buckets: [1, 5, 10, 25, 50, 100],
    });

    log.info('MetricsService initialized');
  }

  public async start(): Promise<void> {
    // Initial collection
    await this.collectMetrics();

    // Start periodic collection
    this.collectionTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        log.error('Error collecting metrics:', error);
      }
    }, this.collectionInterval);

    log.info(`MetricsService started with ${this.collectionInterval}ms collection interval`);
  }

  public stop(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
    log.info('MetricsService stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const stats = await this.transactionRepository.getStatistics();

      // Update gauges
      this.transactionsTotal.set(stats.totalTransactions);
      this.pendingTransactions.set(stats.pendingTransactions);
      this.avgProcessingTimeSeconds.set(stats.averageProcessingTime);

      // Update by-status gauge
      this.transactionsByStatus.labels('pending').set(stats.pendingTransactions);
      this.transactionsByStatus.labels('completed').set(stats.completedTransactions);
      this.transactionsByStatus.labels('failed').set(stats.failedTransactions);

      // Update uptime
      const uptimeSeconds = (Date.now() - this.startTime) / 1000;
      this.uptimeSeconds.set(uptimeSeconds);

    } catch (error) {
      log.error('Error fetching transaction statistics for metrics:', error);
    }
  }

  public async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  public getContentType(): string {
    return client.register.contentType;
  }

  // Methods to record specific events
  public recordTransactionProcessed(): void {
    this.transactionsProcessedTotal.inc();
  }

  public recordTransactionFailed(): void {
    this.transactionsFailedTotal.inc();
  }

  public recordBatchProcessed(size: number): void {
    this.batchesProcessedTotal.inc();
    this.batchSize.observe(size);
  }

  public recordProcessingDuration(durationSeconds: number): void {
    this.transactionProcessingDuration.observe(durationSeconds);
  }
}

export function initMetricsService(config: MetricsServiceConfig): MetricsService {
  if (metricsServiceInstance) {
    return metricsServiceInstance;
  }
  metricsServiceInstance = new MetricsService(config);
  return metricsServiceInstance;
}

export function getMetricsService(): MetricsService | null {
  return metricsServiceInstance;
}
