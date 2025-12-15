import 'reflect-metadata';
import {
  ContractAddresses,
} from './types/types';
import { TransactionService } from './transaction/transaction.service';
import { TransactionRepository } from './database/transaction.repository';
import { log } from './utils/logger';
import { ethers } from 'ethers';
import * as viaEthers from 'via-ethers';
import { DepositExecutedRepository } from './database/depositExecuted.repository';
import { MessageWithdrawalExecutedRepository } from './database/messageWithdrawalExecuted.repository';
import { L1MessageSentRepository } from './database/l1MessageSent.repository';
import { L2MessageSentRepository } from './database/l2MessageSent.repository';
import { VaultControllerTransactionRepository } from './database/vaultControllerTransaction.repository';
import { relayerDataSource, graphDataSource } from './database/typeorm.config';
import { ProviderFactory } from './utils/providerFactory';
import { FailoverProvider } from './utils/failoverProvider';
import { appConfig } from './utils/config';

async function main() {
  log.info('🚀 Blockchain Bridge Monitor - Bridge Events (with Failover Providers)');
  log.info('='.repeat(60));

  // Log the configuration source and values
  log.info('📋 Configuration validation: ✅ All required variables present and valid');

  let transactionService: TransactionService | null = null;
  let transactionRepository: TransactionRepository | null = null;
  let depositExecutedRepository: DepositExecutedRepository | null = null;
  let messageWithdrawalExecutedRepository: MessageWithdrawalExecutedRepository | null = null;
  let l1MessageSentRepository: L1MessageSentRepository | null = null;
  let l2MessageSentRepository: L2MessageSentRepository | null = null;
  let vaultControllerTransactionRepository: VaultControllerTransactionRepository | null = null;
  let ethProvider: ethers.Provider | null = null;
  let viaProvider: viaEthers.Provider | null = null;

  try {
    // Create failover providers with automatic fallback capabilities
    log.info('🔄 Creating failover providers...');

    // ETH Provider with failover
    ethProvider = ProviderFactory.createFromConfig({
      primary: appConfig.ethUrl,
      fallbacks: appConfig.ethFallbackUrls,
      name: 'ETH-Provider',
      maxRetries: 3,
      retryDelay: 1000,
      requestTimeout: 30000
    });

    // Via Provider - use viaEthers.Provider for proper L2 transaction support
    log.info(`Creating viaEthers.Provider for: ${appConfig.viaUrl}`);
    viaProvider = new viaEthers.Provider(appConfig.viaUrl);

    // Test provider connectivity
    log.info('🔍 Testing provider connectivity...');

    if (ethProvider instanceof FailoverProvider) {
      const ethStatus = await ethProvider.testAllProviders();
      log.info('ETH Provider Status:', ethStatus);
    }

    // Test basic connectivity
    try {
      const [ethBlockNumber, viaBlockNumber] = await Promise.all([
        ethProvider.getBlockNumber(),
        viaProvider.getBlockNumber()
      ]);

      log.info(`✅ ETH Provider connected - Block: ${ethBlockNumber}`);
      log.info(`✅ Via Provider connected - Block: ${viaBlockNumber}`);
    } catch (error) {
      log.error('❌ Provider connectivity test failed:', error);
      throw error;
    }

    // Initialize database connections
    log.info('🔄 Initializing database connections...');
    
    // Initialize relayer DataSource
    log.info('🔄 Connecting to relayer database...');
    if (!relayerDataSource.isInitialized) {
      await relayerDataSource.initialize();
    }
    log.info('✅ Relayer database connected');

    // Initialize graph DataSource
    log.info('🔄 Connecting to graph database...');
    if (appConfig.isGraphDatabaseSeparate()) {
      log.info('📊 Graph database is configured separately');
    } else {
      log.info('📊 Graph database shares connection with relayer database');
    }
    if (!graphDataSource.isInitialized) {
      await graphDataSource.initialize();
    }
    log.info('✅ Graph database connected');

    // Initialize database repositories
    transactionRepository = new TransactionRepository();
    depositExecutedRepository = new DepositExecutedRepository();
    messageWithdrawalExecutedRepository = new MessageWithdrawalExecutedRepository();
    l1MessageSentRepository = new L1MessageSentRepository();
    l2MessageSentRepository = new L2MessageSentRepository();
    vaultControllerTransactionRepository = new VaultControllerTransactionRepository();

    // Connect all repositories (they will use their respective pre-initialized DataSources)
    await transactionRepository.connect();
    await depositExecutedRepository.connect();
    await messageWithdrawalExecutedRepository.connect();
    await l1MessageSentRepository.connect();
    await l2MessageSentRepository.connect();
    await vaultControllerTransactionRepository.connect();
    log.info('✅ All repository connections established');

    if (appConfig.ethereumBridgeAddress || appConfig.viaBridgeAddress) {
      log.info('🔄 Starting Transaction Service with Failover Providers...');
      const contractAddresses: ContractAddresses = {
        ethereumBridge: appConfig.ethereumBridgeAddress,
        viaBridge: appConfig.viaBridgeAddress,
      };

      transactionService = new TransactionService(
        ethProvider,
        viaProvider,
        contractAddresses,
        transactionRepository,
        depositExecutedRepository,
        messageWithdrawalExecutedRepository,
        l1MessageSentRepository,
        l2MessageSentRepository,
        vaultControllerTransactionRepository,
        Number(appConfig.workerPollingInterval)
      );

      await transactionService.startWorkers();
      log.info('✅ Transaction Service started successfully with failover capabilities');

      // Set up periodic provider health checks
      setInterval(async () => {
        try {
          if (ethProvider instanceof FailoverProvider) {
            const status = ethProvider.getProviderStatus();
            log.debug(`ETH Provider Status: Index ${status.currentIndex}, URL: ${status.currentUrl}`);
          }
        } catch (error) {
          log.warn('Provider health check failed:', error);
        }
      }, 60000); // Check every minute

    } else {
      log.warn('⚠️  Transaction Service not started - missing bridge addresses');
    }

    if (!appConfig.ethereumBridgeAddress && !appConfig.viaBridgeAddress) {
      log.error('❌ No bridge addresses configured. Please set ETHEREUM_BRIDGE_ADDRESS and/or VIA_BRIDGE_ADDRESS');
      process.exit(1);
    }

    // Set up graceful shutdown with guard to prevent double execution
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        log.info(`📴 Shutdown already in progress, ignoring ${signal}...`);
        return;
      }
      isShuttingDown = true;
      log.info(`📴 Received ${signal}. Starting graceful shutdown...`);

      try {
        if (transactionService) {
          log.info('🔄 Stopping Transaction Service...');
          await transactionService.stopWorkers();
          log.info('✅ Transaction Service stopped');
        }

        // Close relayer DataSource (handles all relayer repositories)
        if (relayerDataSource.isInitialized) {
          log.info('🔄 Closing relayer database connection...');
          await relayerDataSource.destroy();
          log.info('✅ Relayer database connection closed');
        }

        // Close graph DataSource (handles all graph repositories)
        if (graphDataSource.isInitialized) {
          log.info('🔄 Closing graph database connection...');
          await graphDataSource.destroy();
          log.info('✅ Graph database connection closed');
        }

        log.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        log.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      log.error('❌ Unhandled Rejection at:', { promise, reason });
      gracefulShutdown('unhandledRejection');
    });

    log.info('🎯 Bridge Monitor is running with failover providers...');
    log.info('📡 Monitoring blockchain events and processing transactions...');

    // Keep the process alive
    process.on('beforeExit', () => {
      log.info('📴 Process is about to exit...');
    });

  } catch (error) {
    log.error('💥 Failed to start Bridge Monitor:', error);

    // Attempt to cleanup on error - close DataSources directly
    try {
      if (relayerDataSource.isInitialized) {
        await relayerDataSource.destroy();
      }
      if (graphDataSource.isInitialized) {
        await graphDataSource.destroy();
      }
    } catch (cleanupError) {
      log.error('❌ Error during cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  log.error('💥 Critical error in main():', error);
  process.exit(1);
});