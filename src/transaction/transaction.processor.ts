import { TransactionRepository } from '../database/transaction.repository';
import { DepositExecutedRepository } from '../database/depositExecuted.repository';
import { L2MessageSentRepository } from '../database/l2MessageSent.repository';
import { VaultControllerTransactionRepository } from '../database/vaultControllerTransaction.repository';
import {
  IL1MessageSentRepository,
  IMessageWithdrawalExecutedRepository,
  IWithdrawalStateUpdatedRepository,
} from '../database/interfaces';
import {
  ContractAddresses, BridgeOrigin,
} from '../types/types';
import { ethers } from 'ethers';
import logger from '../utils/logger';
import { HandlerFactory } from './handlers/handlerFactory';

export enum TransactionProcessorStatus {
  New = 0,
  SendFinalize = 1,
  Pending = 2,
  Failed = 3,
  FetchL1BatchNumber = 4,
  UpdateVaultController = 5,
  CheckWithdrawalStateUpdated = 6,
  CheckStalePending = 7,
}

export type TransactionProcessorArgs = {
  status: TransactionProcessorStatus,
  transactionRepository: TransactionRepository,
  depositExecutedRepository: DepositExecutedRepository,
  messageWithdrawalExecutedRepository: IMessageWithdrawalExecutedRepository,
  l1MessageSentRepository: IL1MessageSentRepository,
  l2MessageSentRepository: L2MessageSentRepository,
  vaultControllerTransactionRepository: VaultControllerTransactionRepository,
  withdrawalStateUpdatedRepository: IWithdrawalStateUpdatedRepository,
  contractAddresses: ContractAddresses,
  origin: BridgeOrigin,
  originProvider: ethers.Provider,
  destinationProvider: ethers.Provider
}

export class TransactionProcessor {
  protected readonly transactionRepository: TransactionRepository;
  protected readonly depositExecutedRepository: DepositExecutedRepository;
  protected readonly messageWithdrawalExecutedRepository: IMessageWithdrawalExecutedRepository;
  protected readonly l1MessageSentRepository: IL1MessageSentRepository;
  protected readonly l2MessageSentRepository: L2MessageSentRepository;
  protected readonly vaultControllerTransactionRepository: VaultControllerTransactionRepository;
  protected readonly withdrawalStateUpdatedRepository: IWithdrawalStateUpdatedRepository;
  protected readonly contractAddresses: ContractAddresses;
  protected readonly origin: BridgeOrigin;
  protected readonly originProvider: ethers.Provider;
  protected readonly destinationProvider: ethers.Provider;
  protected readonly status: TransactionProcessorStatus;

  constructor(args: TransactionProcessorArgs) {
    this.status = args.status;
    this.transactionRepository = args.transactionRepository;
    this.depositExecutedRepository = args.depositExecutedRepository;
    this.messageWithdrawalExecutedRepository = args.messageWithdrawalExecutedRepository;
    this.l1MessageSentRepository = args.l1MessageSentRepository;
    this.l2MessageSentRepository = args.l2MessageSentRepository;
    this.vaultControllerTransactionRepository = args.vaultControllerTransactionRepository;
    this.withdrawalStateUpdatedRepository = args.withdrawalStateUpdatedRepository;
    this.contractAddresses = args.contractAddresses;
    this.origin = args.origin;
    this.originProvider = args.originProvider;
    this.destinationProvider = args.destinationProvider;
  }

  public async processNextBatch(): Promise<boolean> {
    const handler = HandlerFactory.createHandler({
      status: this.status,
      transactionRepository: this.transactionRepository,
      depositExecutedRepository: this.depositExecutedRepository,
      messageWithdrawalExecutedRepository: this.messageWithdrawalExecutedRepository,
      l1MessageSentRepository: this.l1MessageSentRepository,
      l2MessageSentRepository: this.l2MessageSentRepository,
      vaultControllerTransactionRepository: this.vaultControllerTransactionRepository,
      withdrawalStateUpdatedRepository: this.withdrawalStateUpdatedRepository,
      contractAddresses: this.contractAddresses,
      origin: this.origin,
      originProvider: this.originProvider,
      destinationProvider: this.destinationProvider
    });
    try {
      return await handler.handle();
    } catch (error) {
      logger.error('Error in TransactionProcessor processNextBatch:', error);
      return false;
    }
  }
}
