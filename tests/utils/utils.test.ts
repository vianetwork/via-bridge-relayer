import {
  decodeInitiatedLog,
  decodeEthInitiatedLog,
  decodeViaInitiatedLog,
  decodeFinalizedLog,
  decodeEthFinalizedLog,
  decodeViaFinalizedLog,
} from '../../src/utils/utils';
import { BridgeOrigin } from '../../src/types/types';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
    parseEther: jest.fn((value) => `${value}_ETH`),
  },
}));

// Mock contract ABIs
jest.mock('../../src/contracts/EthereumBridge', () => ({
  ETHEREUM_BRIDGE_ABI: ['function initiateBridge()', 'function finalizeBridge()'],
}));

jest.mock('../../src/contracts/ViaBridge', () => ({
  VIA_BRIDGE_ABI: ['function initiateBridge()', 'function finalizeBridge()'],
}));

describe('Utils', () => {
  let mockProvider: jest.Mocked<ethers.Provider>;
  let mockContract: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProvider = {} as jest.Mocked<ethers.Provider>;

    mockContract = {
      interface: {
        decodeEventLog: jest.fn(),
      },
    };

    (ethers.Contract as jest.Mock).mockImplementation(() => mockContract);
  });

  describe('decodeInitiatedLog', () => {
    const mockEvent = {
      fragment: { name: 'BridgeInitiated' },
      data: '0x123',
      topics: ['0x456'],
      blockNumber: 100,
      transactionHash: '0xabc',
    };
    const contractAddress = '0x1234567890123456789012345678901234567890';

    it('should decode Ethereum initiated log', () => {
      const mockArgs = [
        '0xtoken',
        ethers.parseEther('1.0'),
        '0xfrom',
        '0xto',
        ethers.parseEther('0.1'),
      ];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeInitiatedLog(
        BridgeOrigin.Ethereum,
        mockEvent,
        contractAddress,
        mockProvider
      );

      expect(result).toEqual({
        eventName: 'BridgeInitiated',
        args: {
          ethTokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          from: '0xfrom',
          to: '0xto',
          value: ethers.parseEther('0.1'),
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });

    it('should decode Via initiated log', () => {
      const mockArgs = [
        '0xviatoken',
        '0xethtoken',
        ethers.parseEther('1.0'),
        '0xfrom',
        '0xto',
        ethers.parseEther('0.1'),
      ];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeInitiatedLog(
        BridgeOrigin.Via,
        mockEvent,
        contractAddress,
        mockProvider
      );

      expect(result).toEqual({
        eventName: 'BridgeInitiated',
        args: {
          viaTokenAddress: '0xviatoken',
          ethTokenAddress: '0xethtoken',
          amount: ethers.parseEther('1.0'),
          from: '0xfrom',
          to: '0xto',
          value: ethers.parseEther('0.1'),
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });

  describe('decodeEthInitiatedLog', () => {
    it('should decode Ethereum initiated log with log property', () => {
      const mockEvent = {
        fragment: { name: 'BridgeInitiated' },
        log: {
          data: '0x123',
          topics: ['0x456'],
          blockNumber: 100,
          transactionHash: '0xabc',
        },
      };
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const mockArgs = [
        '0xtoken',
        ethers.parseEther('1.0'),
        '0xfrom',
        '0xto',
        ethers.parseEther('0.1'),
      ];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeEthInitiatedLog(mockEvent, contractAddress, mockProvider);

      expect(result).toEqual({
        eventName: 'BridgeInitiated',
        args: {
          ethTokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          from: '0xfrom',
          to: '0xto',
          value: ethers.parseEther('0.1'),
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });

      expect(mockContract.interface.decodeEventLog).toHaveBeenCalledWith(
        'BridgeInitiated',
        '0x123',
        ['0x456']
      );
    });

    it('should decode Ethereum initiated log without log property', () => {
      const mockEvent = {
        fragment: { name: 'BridgeInitiated' },
        data: '0x123',
        topics: ['0x456'],
        blockNumber: 100,
        transactionHash: '0xabc',
      };
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const mockArgs = [
        '0xtoken',
        ethers.parseEther('1.0'),
        '0xfrom',
        '0xto',
        ethers.parseEther('0.1'),
      ];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeEthInitiatedLog(mockEvent, contractAddress, mockProvider);

      expect(result).toEqual({
        eventName: 'BridgeInitiated',
        args: {
          ethTokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          from: '0xfrom',
          to: '0xto',
          value: ethers.parseEther('0.1'),
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });

  describe('decodeViaInitiatedLog', () => {
    it('should decode Via initiated log', () => {
      const mockEvent = {
        fragment: { name: 'BridgeInitiated' },
        data: '0x123',
        topics: ['0x456'],
        blockNumber: 100,
        transactionHash: '0xabc',
      };
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const mockArgs = [
        '0xviatoken',
        '0xethtoken',
        ethers.parseEther('1.0'),
        '0xfrom',
        '0xto',
        ethers.parseEther('0.1'),
      ];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeViaInitiatedLog(mockEvent, contractAddress, mockProvider);

      expect(result).toEqual({
        eventName: 'BridgeInitiated',
        args: {
          viaTokenAddress: '0xviatoken',
          ethTokenAddress: '0xethtoken',
          amount: ethers.parseEther('1.0'),
          from: '0xfrom',
          to: '0xto',
          value: ethers.parseEther('0.1'),
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });

  describe('decodeFinalizedLog', () => {
    const mockEvent = {
      fragment: { name: 'BridgeFinalized' },
      data: '0x123',
      topics: ['0x456'],
      blockNumber: 100,
      transactionHash: '0xabc',
    };
    const contractAddress = '0x1234567890123456789012345678901234567890';

    it('should decode Ethereum finalized log', () => {
      const mockArgs = ['0xtoken', ethers.parseEther('1.0'), '0xto'];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeFinalizedLog(
        BridgeOrigin.Ethereum,
        mockEvent,
        contractAddress,
        mockProvider
      );

      expect(result).toEqual({
        eventName: 'BridgeFinalized',
        args: {
          tokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          to: '0xto',
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });

    it('should decode Via finalized log', () => {
      const mockArgs = ['0xtoken', ethers.parseEther('1.0'), '0xto'];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeFinalizedLog(
        BridgeOrigin.Via,
        mockEvent,
        contractAddress,
        mockProvider
      );

      expect(result).toEqual({
        eventName: 'BridgeFinalized',
        args: {
          tokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          to: '0xto',
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });

  describe('decodeEthFinalizedLog', () => {
    it('should decode Ethereum finalized log', () => {
      const mockEvent = {
        fragment: { name: 'BridgeFinalized' },
        data: '0x123',
        topics: ['0x456'],
        blockNumber: 100,
        transactionHash: '0xabc',
      };
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const mockArgs = ['0xtoken', ethers.parseEther('1.0'), '0xto'];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeEthFinalizedLog(mockEvent, contractAddress, mockProvider);

      expect(result).toEqual({
        eventName: 'BridgeFinalized',
        args: {
          tokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          to: '0xto',
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });

  describe('decodeViaFinalizedLog', () => {
    it('should decode Via finalized log', () => {
      const mockEvent = {
        fragment: { name: 'BridgeFinalized' },
        data: '0x123',
        topics: ['0x456'],
        blockNumber: 100,
        transactionHash: '0xabc',
      };
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const mockArgs = ['0xtoken', ethers.parseEther('1.0'), '0xto'];

      mockContract.interface.decodeEventLog.mockReturnValue(mockArgs);

      const result = decodeViaFinalizedLog(mockEvent, contractAddress, mockProvider);

      expect(result).toEqual({
        eventName: 'BridgeFinalized',
        args: {
          tokenAddress: '0xtoken',
          amount: ethers.parseEther('1.0'),
          to: '0xto',
        },
        address: contractAddress,
        blockNumber: 100,
        transactionHash: '0xabc',
        origin: BridgeOrigin.Ethereum,
      });
    });
  });
});