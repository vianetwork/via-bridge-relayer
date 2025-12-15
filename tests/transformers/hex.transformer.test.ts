import { hexTransformer } from '../../src/transformers/hex.transformer';

describe('hexTransformer', () => {
  describe('to method (to database)', () => {
    it('should convert hex string with 0x prefix to Buffer', () => {
      const result = hexTransformer.to('0x48656c6c6f');
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString('utf8')).toBe('Hello');
    });

    it('should convert hex string without 0x prefix to Buffer', () => {
      const result = hexTransformer.to('48656c6c6f');
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString('utf8')).toBe('Hello');
    });

    it('should handle empty hex string', () => {
      const result = hexTransformer.to('0x');
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.length).toBe(0);
    });

    it('should handle null and undefined values', () => {
      expect(hexTransformer.to(null)).toBeNull();
      expect(hexTransformer.to(undefined)).toBeNull();
    });

    it('should handle various hex values', () => {
      const testCases = [
        { input: '0x00', expected: Buffer.from([0x00]) },
        { input: '0xff', expected: Buffer.from([0xff]) },
        { input: '0x1234567890abcdef', expected: Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]) },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = hexTransformer.to(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle uppercase and lowercase hex', () => {
      const lowercase = hexTransformer.to('0xabcdef');
      const uppercase = hexTransformer.to('0xABCDEF');
      expect(lowercase).toEqual(uppercase);
    });
  });

  describe('from method (from database)', () => {
    it('should convert Buffer to hex string with 0x prefix', () => {
      const buffer = Buffer.from('Hello', 'utf8');
      const result = hexTransformer.from(buffer);
      expect(result).toBe('0x48656c6c6f');
    });

    it('should handle empty Buffer', () => {
      const buffer = Buffer.alloc(0);
      const result = hexTransformer.from(buffer);
      expect(result).toBe('0x');
    });

    it('should handle null and undefined values', () => {
      expect(hexTransformer.from(null)).toBeNull();
      expect(hexTransformer.from(undefined)).toBeNull();
    });

    it('should handle various Buffer values', () => {
      const testCases = [
        { input: Buffer.from([0x00]), expected: '0x00' },
        { input: Buffer.from([0xff]), expected: '0xff' },
        { input: Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef]), expected: '0x1234567890abcdef' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = hexTransformer.from(input);
        expect(result).toBe(expected);
      });
    });

    it('should output lowercase hex', () => {
      const buffer = Buffer.from([0xab, 0xcd, 0xef]);
      const result = hexTransformer.from(buffer);
      expect(result).toBe('0xabcdef');
    });
  });

  describe('roundtrip conversion', () => {
    it('should handle roundtrip with 0x prefix', () => {
      const original = '0x48656c6c6f576f726c64';
      const converted = hexTransformer.to(original);
      const restored = hexTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle roundtrip without 0x prefix', () => {
      const original = '48656c6c6f576f726c64';
      const converted = hexTransformer.to(original);
      const restored = hexTransformer.from(converted);
      expect(restored).toBe('0x' + original);
    });

    it('should handle null roundtrip', () => {
      const original = null;
      const converted = hexTransformer.to(original);
      const restored = hexTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle empty string roundtrip', () => {
      const original = '0x';
      const converted = hexTransformer.to(original);
      const restored = hexTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle common Ethereum values', () => {
      const testCases = [
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
        '0xffffffffffffffffffffffffffffffffffffffff',
        '0xa1b2c3d4e5f6789012345678901234567890abcd',
      ];

      testCases.forEach((original) => {
        const converted = hexTransformer.to(original);
        const restored = hexTransformer.from(converted);
        expect(restored).toBe(original);
      });
    });
  });
});