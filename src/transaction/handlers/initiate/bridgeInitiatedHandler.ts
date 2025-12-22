import { ethers } from 'ethers';
import { BridgeOrigin } from '../../../types/types';
import logger from '../../../utils/logger';
import { GlobalHandler } from '../globalHandler';
import { TransactionStatus, L1MessageSent, L2MessageSent } from '../../../entities';
import { appConfig } from '../../../utils/config';
import * as viaEthers from 'via-ethers';

export class BridgeInitiatedHandler extends GlobalHandler {

  async handle(): Promise<boolean> {
    const lastProcessedBlockFromDb = await this.transactionRepository.getLastProcessedBlock(this.origin);
    const lastProcessedBlock = Math.max(lastProcessedBlockFromDb, this.startingBlock);

    const currentBlock = await this.originProvider.getBlockNumber();
    const safeBlock = currentBlock - this.originBlockConfirmations;

    logger.debug('Polling new bridge initiated events from DB', {
      origin: this.origin,
      lastProcessedBlockFromDb,
      startingBlock: this.startingBlock,
      lastProcessedBlock,
      currentBlock,
      safeBlock
    });

    const initiatedEvents = await this.getNextBridgeInitiatedEvents(lastProcessedBlock, safeBlock);

    if (initiatedEvents.length > 0) {
      const processed = await this.processNewBridgeInitiatedEvents(initiatedEvents);
      if (processed) {
        return true;
      }
    }
    return false;
  }



  private async processNewBridgeInitiatedEvents(events: Array<L1MessageSent | L2MessageSent>): Promise<boolean> {
    let hasProcessed = false;
    for (const event of events) {
      try {
        const transactionHash = event.transactionHash;

        logger.debug('Processing event', { eventId: event.id, transactionHash });

        const txExists = await this.transactionRepository.findByBridgeInitiatedTransactionHash(transactionHash);

        if (txExists) {
          logger.debug('Transaction already exists, skipping:', { transactionHash });
          continue;
        }


        const payload = event.payload;

        // Determine event type
        const eventType = this.origin === BridgeOrigin.Ethereum ? 'DepositMessageSent' : 'WithdrawalSent';

        // Send transaction to destination
        const contractTx = await this.finalizeBridgeTransaction({ payload });
        
        logger.info('Transaction sent successfully:', {
          bridgeTxHash: transactionHash,
          finalizedTxHash: contractTx.hash,
        });

        await this.transactionRepository.create({
          bridgeInitiatedTransactionHash: transactionHash,
          finalizedTransactionHash: contractTx.hash,
          status: TransactionStatus.Pending,
          payload: payload,
          origin: this.origin,
          eventType: eventType,
          subgraphId: event.id,
          originBlockNumber: Number(event.blockNumber),
        });

        hasProcessed = true;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Error processing event', { 
          eventId: event.id, 
          error: errorMessage,
          stack: errorStack 
        });
        return true;
      }
    }
    return hasProcessed;
  }

  private async finalizeBridgeTransaction(
    transaction: any,
  ): Promise<any> {

    const payload = transaction.payload;

    const bridgeContract = this.getDestinationBridgeContract();
    const wallet = this.getDestinationWallet();
    const destinationChain = this.origin === BridgeOrigin.Ethereum ? 'Via' : 'Ethereum';

    // Get provider URL for debugging
    let providerUrl = 'unknown';
    try {
      const provider = wallet.provider as any;
      if (provider?._getConnection) {
        providerUrl = (await provider._getConnection())?.url || 'unknown';
      } else if (provider?.connection?.url) {
        providerUrl = provider.connection.url;
      }
    } catch (e) {
      // Ignore errors getting provider URL
    }

    logger.info('Attempting to send transaction', {
      destinationChain,
      walletAddress: wallet.address,
      providerUrl,
      origin: this.origin,
    });

    try {
      const tx = await bridgeContract.receiveMessage.populateTransaction(payload);
      return await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
      });
    } catch (txError) {
      const errorMsg = txError instanceof Error ? txError.message : String(txError);
      const errorStack = txError instanceof Error ? txError.stack : undefined;
      logger.error('Failed to send transaction', { 
        error: errorMsg, 
        stack: errorStack,
        destinationChain,
        walletAddress: wallet.address 
      });
      throw txError;
    }
  }

  private async getNextBridgeInitiatedEvents(lastBlock: number, safeBlock: number): Promise<Array<L1MessageSent | L2MessageSent>> {
    const limit = this.transactionBatchSize;

    if (this.origin === BridgeOrigin.Ethereum) {
      return await this.l1MessageSentRepository.getEventsSinceBlock(lastBlock, safeBlock, limit);
    } else {
      return await this.l2MessageSentRepository.getEventsSinceBlock(lastBlock, safeBlock, limit);
    }
  }
}


function configId(event: any): string {
  return event.id;
}