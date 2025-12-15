import { ethers } from 'ethers';
import * as viaEthers from 'via-ethers';
import { appConfig } from '../utils/config';
import { Mutex } from 'async-mutex';

/**
 * L1 Nonce Wallet - Uses ethers for Ethereum L1 transactions
 */
export class L1NonceWallet extends ethers.Wallet {
  private nonceMutex = new Mutex();

  constructor(privateKey: string, provider: ethers.Provider) {
    super(privateKey, provider);
  }

  public async getNonce(): Promise<number> {
    return await this.nonceMutex.runExclusive(() => {
      return super.getNonce();
    });
  }
}

/**
 * L2 Nonce Wallet - Uses via-ethers for Via L2 transactions
 */
export class L2NonceWallet extends viaEthers.Wallet {
  private nonceMutex = new Mutex();

  constructor(privateKey: string, provider: viaEthers.Provider) {
    super(privateKey, provider);
  }

  public async getNonce(): Promise<number> {
    return await this.nonceMutex.runExclusive(() => {
      return super.getNonce();
    });
  }
}

export class NonceWalletManager {
  private static instance: NonceWalletManager;
  private l1Wallet: L1NonceWallet | null = null;
  private l2Wallet: L2NonceWallet | null = null;
  private l1Provider: ethers.Provider | null = null;
  private l2Provider: viaEthers.Provider | null = null;

  private constructor() {}

  public static getInstance(): NonceWalletManager {
    if (!NonceWalletManager.instance) {
      NonceWalletManager.instance = new NonceWalletManager();
    }
    return NonceWalletManager.instance;
  }

  /**
   * Get L1 (Ethereum) wallet using ethers
   */
  public getL1Wallet(provider: ethers.Provider): L1NonceWallet {
    if (!this.l1Wallet || this.l1Provider !== provider) {
      const privateKey = appConfig.relayerPrivateKey;
      if (!privateKey) {
        throw new Error('RELAYER_PRIVATE_KEY not configured');
      }
      this.l1Wallet = new L1NonceWallet(privateKey, provider);
      this.l1Provider = provider;
    }

    return this.l1Wallet;
  }

  /**
   * Get L2 (Via) wallet using via-ethers
   */
  public getL2Wallet(provider: viaEthers.Provider): L2NonceWallet {
    if (!this.l2Wallet || this.l2Provider !== provider) {
      const privateKey = appConfig.relayerPrivateKey;
      if (!privateKey) {
        throw new Error('RELAYER_PRIVATE_KEY not configured');
      }
      this.l2Wallet = new L2NonceWallet(privateKey, provider);
      this.l2Provider = provider;
    }

    return this.l2Wallet;
  }

  public getL1Provider(): ethers.Provider | null {
    return this.l1Provider;
  }

  public getL2Provider(): viaEthers.Provider | null {
    return this.l2Provider;
  }
}
