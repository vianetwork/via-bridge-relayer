import { ethers } from 'ethers';
import * as viaEthers from 'via-ethers';
import { TransactionWorker } from './transaction.worker';
import {
  TransactionProcessor,
  TransactionProcessorStatus,
} from './transaction.processor';
import { TransactionRepository } from '../database/transaction.repository';
import { DepositExecutedRepository } from '../database/depositExecuted.repository';
import { L2MessageSentRepository } from '../database/l2MessageSent.repository';
import { VaultControllerTransactionRepository } from '../database/vaultControllerTransaction.repository';
import { IL1MessageSentRepository, IMessageWithdrawalExecutedRepository, IWithdrawalStateUpdatedRepository } from '../database/interfaces';
import { ContractAddresses, BridgeOrigin } from '../types/types';

export class TransactionService {
  private readonly transactionWorkersEth: TransactionWorker[] = [];
  private readonly transactionWorkersVia: TransactionWorker[] = [];

  constructor(
    private readonly providerEth: ethers.Provider,
    private readonly providerVia: viaEthers.Provider,
    private readonly contractAddresses: ContractAddresses,
    private readonly transactionRepository: TransactionRepository,
    private readonly depositExecutedRepository: DepositExecutedRepository,
    private readonly messageWithdrawalExecutedRepository: IMessageWithdrawalExecutedRepository,
    private readonly l1MessageSentRepository: IL1MessageSentRepository,
    private readonly l2MessageSentRepository: L2MessageSentRepository,
    private readonly vaultControllerTransactionRepository: VaultControllerTransactionRepository,
    private readonly withdrawalStateUpdatedRepository: IWithdrawalStateUpdatedRepository,
    private readonly pollingInterval: number
  ) {
    this.transactionWorkersEth = [
      TransactionProcessorStatus.New,
      TransactionProcessorStatus.Pending,
      TransactionProcessorStatus.CheckStalePending,
    ].map(
      (status) =>
        new TransactionWorker(
          new TransactionProcessor(
            {
              status,
              transactionRepository: this.transactionRepository,
              depositExecutedRepository: this.depositExecutedRepository,
              messageWithdrawalExecutedRepository: this.messageWithdrawalExecutedRepository,
              l1MessageSentRepository: this.l1MessageSentRepository,
              l2MessageSentRepository: this.l2MessageSentRepository,
              vaultControllerTransactionRepository: this.vaultControllerTransactionRepository,
              withdrawalStateUpdatedRepository: this.withdrawalStateUpdatedRepository,
              contractAddresses: this.contractAddresses,
              origin: BridgeOrigin.Ethereum,
              originProvider: this.providerEth,
              destinationProvider: this.providerVia
            }
          ),
          this.pollingInterval
        )
    );
    this.transactionWorkersVia = [
      TransactionProcessorStatus.New,
      TransactionProcessorStatus.Pending,
      TransactionProcessorStatus.FetchL1BatchNumber,
      TransactionProcessorStatus.UpdateVaultController,
      TransactionProcessorStatus.CheckWithdrawalStateUpdated,
      TransactionProcessorStatus.CheckStalePending,
    ].map(
      (status) =>
        new TransactionWorker(
          new TransactionProcessor(
            {
              status,
              transactionRepository: this.transactionRepository,
              depositExecutedRepository: this.depositExecutedRepository,
              messageWithdrawalExecutedRepository: this.messageWithdrawalExecutedRepository,
              l1MessageSentRepository: this.l1MessageSentRepository,
              l2MessageSentRepository: this.l2MessageSentRepository,
              vaultControllerTransactionRepository: this.vaultControllerTransactionRepository,
              withdrawalStateUpdatedRepository: this.withdrawalStateUpdatedRepository,
              contractAddresses: this.contractAddresses,
              origin: BridgeOrigin.Via,
              originProvider: this.providerVia,
              destinationProvider: this.providerEth
            }
          ),
          this.pollingInterval
        )
    );
  }

  public async startWorkers(): Promise<void> {
    this.transactionWorkersEth.map((transactionWorker) =>
      transactionWorker.start()
    );
    this.transactionWorkersVia.map((transactionWorker) =>
      transactionWorker.start()
    );
  }

  public async stopWorkers(): Promise<void> {
    this.transactionWorkersEth.map((transactionWorker) =>
      transactionWorker.stop()
    );
    this.transactionWorkersVia.map((transactionWorker) =>
      transactionWorker.stop()
    );
  }
}
