/* eslint-disable no-unused-vars */
import { TransactionRepository } from '../../database/transaction.repository';
import { DepositExecutedRepository } from '../../database/depositExecuted.repository';
import { L2MessageSentRepository } from '../../database/l2MessageSent.repository';
import { VaultControllerTransactionRepository } from '../../database/vaultControllerTransaction.repository';
import { IL1MessageSentRepository, IMessageWithdrawalExecutedRepository } from '../../database/interfaces';
import { ContractAddresses, BridgeOrigin } from '../../types/types';
import { ethers, AbiCoder } from 'ethers';
import * as viaEthers from 'via-ethers';
import { appConfig } from '../../utils/config';
import { Handler } from './interfaces/handler';
import { L1NonceWallet, L2NonceWallet, NonceWalletManager } from '../nonceWallet';
import { ETHEREUM_BRIDGE_ABI } from '../../contracts/EthereumBridge';
import { VIA_BRIDGE_ABI } from '../../contracts/ViaBridge';
import { L1_BRIDGE_MESSAGE_MANAGER } from '../../contracts/L1BridgeMessageManager';
import { L2_BRIDGE_MESSAGE_MANAGER } from '../../contracts/L2BridgeMessageManager';

export abstract class GlobalHandler implements Handler {
  private readonly nonceWalletManager: NonceWalletManager = NonceWalletManager.getInstance();

  protected readonly transactionBatchSize: number;
  protected readonly initiateWaitConfirmations: number;
  protected readonly startingBlock: number;
  protected readonly destinationStartingBlock: number;
  protected readonly bridgeInitiatedEvent: string;
  protected readonly originBlockConfirmations: number;
  protected readonly destinationBlockConfirmations: number;

  // Providers typed based on chain
  protected readonly l1Provider: ethers.Provider;
  protected readonly l2Provider: viaEthers.Provider;

  constructor(
    protected readonly transactionRepository: TransactionRepository,
    protected readonly depositExecutedRepository: DepositExecutedRepository,
    protected readonly messageWithdrawalExecutedRepository: IMessageWithdrawalExecutedRepository,
    protected readonly l1MessageSentRepository: IL1MessageSentRepository,
    protected readonly l2MessageSentRepository: L2MessageSentRepository,
    protected readonly vaultControllerTransactionRepository: VaultControllerTransactionRepository,
    protected readonly contractAddresses: ContractAddresses,
    protected readonly origin: BridgeOrigin,
    protected readonly originProvider: ethers.Provider | viaEthers.Provider,
    protected readonly destinationProvider: ethers.Provider | viaEthers.Provider
  ) {
    // Assign providers based on origin
    if (origin === BridgeOrigin.Ethereum) {
      this.l1Provider = originProvider as ethers.Provider;
      this.l2Provider = destinationProvider as viaEthers.Provider;
    } else {
      this.l1Provider = destinationProvider as ethers.Provider;
      this.l2Provider = originProvider as viaEthers.Provider;
    }
    this.originBlockConfirmations =
      origin == BridgeOrigin.Ethereum
        ? Number(appConfig.ethWaitBlockConfirmations)
        : Number(appConfig.viaWaitBlockConfirmations);
    this.destinationBlockConfirmations =
      origin == BridgeOrigin.Ethereum
        ? Number(appConfig.viaWaitBlockConfirmations)
        : Number(appConfig.ethWaitBlockConfirmations);
    this.transactionBatchSize = Number(appConfig.transactionBatchSize);
    this.initiateWaitConfirmations =
      origin == BridgeOrigin.Ethereum
        ? Number(appConfig.ethWaitBlockConfirmations)
        : Number(appConfig.viaWaitBlockConfirmations);
    this.bridgeInitiatedEvent =
      this.origin == BridgeOrigin.Ethereum
        ? appConfig.ethBridgeInitiatedEvent
        : appConfig.viaBridgeInitiatedEvent;
    this.startingBlock =
      this.origin == BridgeOrigin.Ethereum
        ? appConfig.ethStartingBlock
        : appConfig.viaStartingBlock;
    this.destinationStartingBlock =
      this.origin == BridgeOrigin.Ethereum
        ? appConfig.viaStartingBlock
        : appConfig.ethStartingBlock;
  }

  abstract handle(): Promise<boolean>;

  protected getL1Wallet(): L1NonceWallet {
    return this.nonceWalletManager.getL1Wallet(this.l1Provider);
  }

  protected getL2Wallet(): L2NonceWallet {
    return this.nonceWalletManager.getL2Wallet(this.l2Provider);
  }

  protected getOriginWallet(): L1NonceWallet | L2NonceWallet {
    return this.origin === BridgeOrigin.Ethereum
      ? this.getL1Wallet()
      : this.getL2Wallet();
  }

  protected getDestinationWallet(): L1NonceWallet | L2NonceWallet {
    return this.origin === BridgeOrigin.Ethereum
      ? this.getL2Wallet()
      : this.getL1Wallet();
  }

  protected getOriginBridgeContract(): ethers.Contract | viaEthers.Contract {
    const address =
      this.origin === BridgeOrigin.Ethereum
        ? this.contractAddresses.ethereumBridge
        : this.contractAddresses.viaBridge;
    const abi =
      this.origin === BridgeOrigin.Ethereum
        ? ETHEREUM_BRIDGE_ABI
        : VIA_BRIDGE_ABI;

    if (this.origin === BridgeOrigin.Ethereum) {
      return new ethers.Contract(address, abi, this.getL1Wallet());
    } else {
      return new viaEthers.Contract(address, abi, this.getL2Wallet());
    }
  }

  protected getDestinationBridgeContract(): ethers.Contract | viaEthers.Contract {
    const address =
      this.origin === BridgeOrigin.Ethereum
        ? this.contractAddresses.viaBridge
        : this.contractAddresses.ethereumBridge;
    const abi =
      this.origin === BridgeOrigin.Ethereum
        ? VIA_BRIDGE_ABI
        : ETHEREUM_BRIDGE_ABI;

    if (this.origin === BridgeOrigin.Ethereum) {
      return new viaEthers.Contract(address, abi, this.getL2Wallet());
    } else {
      return new ethers.Contract(address, abi, this.getL1Wallet());
    }
  }

  protected getDestinationMessageManagerContract(): ethers.Contract | viaEthers.Contract {
    // If origin is Ethereum, destination is L2 (Via)
    // If origin is Via, destination is L1 (Ethereum)
    const address =
      this.origin === BridgeOrigin.Ethereum
        ? this.contractAddresses.l2BridgeMessageManager
        : this.contractAddresses.l1BridgeMessageManager;
    const abi =
      this.origin === BridgeOrigin.Ethereum
        ? L2_BRIDGE_MESSAGE_MANAGER
        : L1_BRIDGE_MESSAGE_MANAGER;

    if (this.origin === BridgeOrigin.Ethereum) {
      return new viaEthers.Contract(address, abi, this.l2Provider);
    } else {
      return new ethers.Contract(address, abi, this.l1Provider);
    }
  }

  /**
   * Get L2 transaction overrides with fixed gas parameters
   */
  protected getL2TransactionOverrides(): {
    gasPrice: bigint;
    gasLimit: bigint;
    customData: { gasPerPubdata: bigint };
  } {
    return {
      gasPrice: appConfig.l2GasPrice,
      gasLimit: appConfig.l2GasLimit,
      customData: {
        gasPerPubdata: appConfig.l2GasPerPubdata,
      },
    };
  }

  /**
   * Check if the destination chain is L2 (Via)
   */
  protected isDestinationL2(): boolean {
    return this.origin === BridgeOrigin.Ethereum;
  }

  protected async getLastConfirmedBlockNumber(
    provider: ethers.Provider,
    confirmations: number
  ): Promise<number> {
    return (await provider.getBlockNumber()) - confirmations;
  }

  protected async checkTransactionReceipt(
    transactionHash: string,
    provider: ethers.Provider
  ): Promise<boolean> {
    const txReceipt = await provider.getTransactionReceipt(transactionHash);
    if (!txReceipt) {
      return false;
    }
    if (txReceipt.status === 1) {
      return true;
    }

    return false;
  }
}