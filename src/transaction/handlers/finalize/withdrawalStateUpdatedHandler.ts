import { GlobalHandler } from '../globalHandler';
import { VaultControllerTransactionStatus } from '../../../entities/vaultControllerTransaction.entity';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';

/**
 * Handler responsible for checking WithdrawalStateUpdated events on L1
 * and updating the corresponding VaultControllerTransaction status to ReadyToClaim.
 * 
 * This handler:
 * 1. Gets pending VaultControllerTransactions (transaction sent, waiting for event confirmation)
 * 2. Queries the L1 subgraph for WithdrawalStateUpdated events matching those l1BatchNumbers
 * 3. Filters for events that are old enough (have enough block confirmations)
 * 4. Updates matching VaultControllerTransaction status to ReadyToClaim
 */
export class WithdrawalStateUpdatedHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    // This handler only applies to Via origin transactions
    // (Via -> Ethereum withdrawals that need vault controller updates)
    if (this.origin !== BridgeOrigin.Via) {
      return false;
    }

    // Get pending vault controller transactions that need to be checked
    const pendingTransactions = await this.vaultControllerTransactionRepository.getPendingTransactions(
      this.transactionBatchSize
    );

    if (pendingTransactions.length === 0) {
      return false;
    }

    logger.debug('Checking WithdrawalStateUpdated events for pending VaultControllerTransactions', {
      count: pendingTransactions.length
    });

    // Get the l1BatchNumbers to check
    const l1BatchNumbers = pendingTransactions.map(tx => tx.l1BatchNumber);

    // Get the current safe block number on L1 (with confirmations)
    const currentL1Block = await this.l1Provider.getBlockNumber();
    const safeBlockNumber = currentL1Block - this.destinationBlockConfirmations;

    logger.debug('Querying WithdrawalStateUpdated events', {
      l1BatchNumbers,
      currentL1Block,
      safeBlockNumber,
      confirmations: this.destinationBlockConfirmations
    });

    // Query the subgraph for WithdrawalStateUpdated events
    const withdrawalStateUpdatedEvents = await this.vaultControllerTransactionRepository.getWithdrawalStateUpdatedEvents(
      l1BatchNumbers,
      safeBlockNumber,
      this.transactionBatchSize
    );

    if (withdrawalStateUpdatedEvents.length === 0) {
      logger.debug('No confirmed WithdrawalStateUpdated events found yet', {
        l1BatchNumbers,
        safeBlockNumber
      });
      return false;
    }

    logger.debug('Found WithdrawalStateUpdated events', {
      count: withdrawalStateUpdatedEvents.length,
      events: withdrawalStateUpdatedEvents.map(e => ({
        l1Batch: e.l1Batch,
        blockNumber: e.blockNumber,
        transactionHash: e.transactionHash
      }))
    });

    // Get the l1BatchNumbers that have confirmed WithdrawalStateUpdated events
    const confirmedL1BatchNumbers = withdrawalStateUpdatedEvents.map(e => e.l1Batch);

    // Update the status of matching VaultControllerTransactions to ReadyToClaim
    await this.vaultControllerTransactionRepository.updateStatusByL1BatchNumbers(
      confirmedL1BatchNumbers,
      VaultControllerTransactionStatus.ReadyToClaim
    );

    logger.info('Updated VaultControllerTransactions to ReadyToClaim', {
      l1BatchNumbers: confirmedL1BatchNumbers,
      count: confirmedL1BatchNumbers.length
    });

    return true;
  }
}
