import { hash64HexTransformer } from '../../src/transformers/hash64Hex.transformer';

describe('hash64HexTransformer', () => {
  const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validHashWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  describe('to method (to database)', () => {
    it('should convert valid 64-character hex string with 0x prefix to Buffer', () => {
      const result = hash64HexTransformer.to(validHash);
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.length).toBe(32);
    });

    it('should convert valid 64-character hex string without 0x prefix to Buffer', () => {
      const result = hash64HexTransformer.to(validHashWithoutPrefix);
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.length).toBe(32);
    });

    it('should handle null and undefined values', () => {
      expect(hash64HexTransformer.to(null)).toBeNull();
      expect(hash64HexTransformer.to(undefined)).toBeNull();
    });

    it('should throw error for invalid hash length - too short', () => {
      expect(() => {
        hash64HexTransformer.to('0x1234567890abcdef');
      }).toThrow('Invalid hash length: expected 64 characters, got 16');
    });

    it('should throw error for invalid hash length - too long', () => {
      const tooLongHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00';
      expect(() => {
        hash64HexTransformer.to(tooLongHash);
      }).toThrow('Invalid hash length: expected 64 characters, got 66');
    });

    it('should throw error for empty string', () => {
      expect(() => {
        hash64HexTransformer.to('');
      }).toThrow('Invalid hash length: expected 64 characters, got 0');
    });

    it('should throw error for 0x only', () => {
      expect(() => {
        hash64HexTransformer.to('0x');
      }).toThrow('Invalid hash length: expected 64 characters, got 0');
    });

    it('should handle uppercase and lowercase hex', () => {
      const lowercase = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const uppercase = '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
      
      const lowercaseResult = hash64HexTransformer.to(lowercase);
      const uppercaseResult = hash64HexTransformer.to(uppercase);
      
      expect(lowercaseResult).toEqual(uppercaseResult);
    });

    it('should handle common Ethereum transaction hashes', () => {
      const ethHashes = [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        '0xa1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
      ];

      ethHashes.forEach((hash) => {
        const result = hash64HexTransformer.to(hash);
        expect(result).toBeInstanceOf(Buffer);
        expect(result?.length).toBe(32);
      });
    });
  });

  describe('from method (from database)', () => {
    it('should convert Buffer to hex string with 0x prefix', () => {
      const buffer = Buffer.from(validHashWithoutPrefix, 'hex');
      const result = hash64HexTransformer.from(buffer);
      expect(result).toBe(validHash);
    });

    it('should handle null and undefined values', () => {
      expect(hash64HexTransformer.from(null)).toBeNull();
      expect(hash64HexTransformer.from(undefined)).toBeNull();
    });

    it('should handle 32-byte Buffer', () => {
      const buffer = Buffer.alloc(32, 0x42);
      const result = hash64HexTransformer.from(buffer);
      expect(result).toBe('0x4242424242424242424242424242424242424242424242424242424242424242');
    });

    it('should output lowercase hex', () => {
      const buffer = Buffer.from('ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', 'hex');
      const result = hash64HexTransformer.from(buffer);
      expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    });

    it('should handle zero buffer', () => {
      const buffer = Buffer.alloc(32, 0);
      const result = hash64HexTransformer.from(buffer);
      expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should handle max value buffer', () => {
      const buffer = Buffer.alloc(32, 0xff);
      const result = hash64HexTransformer.from(buffer);
      expect(result).toBe('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    });
  });

  describe('roundtrip conversion', () => {
    it('should handle roundtrip with 0x prefix', () => {
      const original = validHash;
      const converted = hash64HexTransformer.to(original);
      const restored = hash64HexTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle roundtrip without 0x prefix', () => {
      const original = validHashWithoutPrefix;
      const converted = hash64HexTransformer.to(original);
      const restored = hash64HexTransformer.from(converted);
      expect(restored).toBe('0x' + original);
    });

    it('should handle null roundtrip', () => {
      const original = null;
      const converted = hash64HexTransformer.to(original);
      const restored = hash64HexTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle common Ethereum values roundtrip', () => {
      const testCases = [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        '0xa1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      ];

      testCases.forEach((original) => {
        const converted = hash64HexTransformer.to(original);
        const restored = hash64HexTransformer.from(converted);
        expect(restored).toBe(original);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle various invalid lengths', () => {
      const invalidHashes = [
        '0x123',
        '0x12345678901234567890123456789012345678901234567890123456789012345678901234',
        '123456789012345678901234567890123456789012345678901234567890123',
        '12345678901234567890123456789012345678901234567890123456789012345',
      ];

      invalidHashes.forEach((hash) => {
        expect(() => {
          hash64HexTransformer.to(hash);
        }).toThrow(/Invalid hash length/);
      });
    });

    it('should handle mixed case correctly', () => {
      const mixedCase = '0x1234567890ABCdef1234567890ABCdef1234567890ABCdef1234567890ABCdef';
      const converted = hash64HexTransformer.to(mixedCase);
      const restored = hash64HexTransformer.from(converted);
      expect(restored).toBe(mixedCase.toLowerCase());
    });
  });
});