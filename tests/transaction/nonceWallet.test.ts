import { ethers } from 'ethers';
// Mock config
jest.mock('../../src/utils/config', () => ({
  appConfig: {
    ethWaitBlockConfirmations: 12,
    viaWaitBlockConfirmations: 6,
    transactionBatchSize: 10,
    ethBridgeInitiatedEvent: 'BridgeInitiated',
    viaBridgeInitiatedEvent: 'BridgeInitiated',
    ethereumBridgeAddress: '0x1234567890123456789012345678901234567890',
    viaBridgeAddress: '0x1234567890123456789012345678901234567891',
    ethUrl: 'http://eth',
    viaUrl: 'http://via',
    relayerPrivateKey: '0x0123456789012345678901234567890123456789012345678901234567890123',
  },
}));

import { NonceWallet, NonceWalletManager } from '../../src/transaction/nonceWallet';

describe('NonceWallet and NonceWalletManager', () => {
  const providerA = { getTransactionCount: jest.fn(), _isProvider: true } as any as ethers.Provider;
  const providerB = { getTransactionCount: jest.fn(), _isProvider: true } as any as ethers.Provider;

  beforeEach(() => {
    process.env.RELAYER_PRIVATE_KEY = '0x'.padEnd(66, '1');
  });

  test('NonceWallet getNonce runs through mutex', async () => {
    const wallet = new NonceWallet(process.env.RELAYER_PRIVATE_KEY!, providerA);
    const spy = jest.spyOn(ethers.Wallet.prototype, 'getNonce').mockResolvedValue(42);
    const [a, b] = await Promise.all([wallet.getNonce(), wallet.getNonce()]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('NonceWalletManager caches per provider and refreshes on provider change', () => {
    const mgr = NonceWalletManager.getInstance();

    const w1 = mgr.getOriginWallet(providerA);
    const w2 = mgr.getOriginWallet(providerA);
    expect(w1).toBe(w2);

    const w3 = mgr.getDestinationWallet(providerB);
    const w4 = mgr.getDestinationWallet(providerB);
    expect(w3).toBe(w4);

    const providerC = { _isProvider: true } as any as ethers.Provider;
    const w5 = mgr.getOriginWallet(providerC);
    expect(w5).not.toBe(w1);

    const providerD = { _isProvider: true } as any as ethers.Provider;
    const w6 = mgr.getDestinationWallet(providerD);
    expect(w6).not.toBe(w3);
  });
});
