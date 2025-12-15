import { bigIntNumberTransformer } from '../../src/transformers/bigIntNumber.transformer';

describe('bigIntNumberTransformer', () => {
  describe('to method (to database)', () => {
    it('should convert number to string', () => {
      expect(bigIntNumberTransformer.to(123)).toBe('123');
      expect(bigIntNumberTransformer.to(0)).toBe('0');
      expect(bigIntNumberTransformer.to(-456)).toBe('-456');
    });

    it('should convert bigint to string', () => {
      expect(bigIntNumberTransformer.to(123n)).toBe('123');
      expect(bigIntNumberTransformer.to(0n)).toBe('0');
      expect(bigIntNumberTransformer.to(-456n)).toBe('-456');
      expect(bigIntNumberTransformer.to(BigInt('999999999999999999999'))).toBe('999999999999999999999');
    });

    it('should convert string to string', () => {
      expect(bigIntNumberTransformer.to('789')).toBe('789');
      expect(bigIntNumberTransformer.to('0')).toBe('0');
      expect(bigIntNumberTransformer.to('-123')).toBe('-123');
    });

    it('should handle null and undefined values', () => {
      expect(bigIntNumberTransformer.to(null)).toBeNull();
      expect(bigIntNumberTransformer.to(undefined)).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(bigIntNumberTransformer.to(Number.MAX_SAFE_INTEGER)).toBe(String(Number.MAX_SAFE_INTEGER));
      expect(bigIntNumberTransformer.to(Number.MIN_SAFE_INTEGER)).toBe(String(Number.MIN_SAFE_INTEGER));
    });
  });

  describe('from method (from database)', () => {
    it('should convert string to number', () => {
      expect(bigIntNumberTransformer.from('123')).toBe(123);
      expect(bigIntNumberTransformer.from('0')).toBe(0);
      expect(bigIntNumberTransformer.from('-456')).toBe(-456);
      expect(bigIntNumberTransformer.from('999999999999999')).toBe(999999999999999);
    });

    it('should handle null and undefined values', () => {
      expect(bigIntNumberTransformer.from(null)).toBeNull();
      expect(bigIntNumberTransformer.from(undefined)).toBeNull();
    });

    it('should handle decimal numbers', () => {
      expect(bigIntNumberTransformer.from('123.456')).toBe(123.456);
      expect(bigIntNumberTransformer.from('-789.012')).toBe(-789.012);
    });

    it('should handle edge cases', () => {
      expect(bigIntNumberTransformer.from(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
      expect(bigIntNumberTransformer.from(String(Number.MIN_SAFE_INTEGER))).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle empty string', () => {
      expect(bigIntNumberTransformer.from('')).toBe(0);
    });
  });

  describe('roundtrip conversion', () => {
    it('should handle number roundtrip', () => {
      const original = 123456;
      const converted = bigIntNumberTransformer.to(original);
      const restored = bigIntNumberTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle bigint roundtrip for safe integers', () => {
      const original = 123456n;
      const converted = bigIntNumberTransformer.to(original);
      const restored = bigIntNumberTransformer.from(converted);
      expect(restored).toBe(Number(original));
    });

    it('should handle string number roundtrip', () => {
      const original = '789012';
      const converted = bigIntNumberTransformer.to(original);
      const restored = bigIntNumberTransformer.from(converted);
      expect(restored).toBe(Number(original));
    });

    it('should handle null roundtrip', () => {
      const original = null;
      const converted = bigIntNumberTransformer.to(original);
      const restored = bigIntNumberTransformer.from(converted);
      expect(restored).toBe(original);
    });
  });
});