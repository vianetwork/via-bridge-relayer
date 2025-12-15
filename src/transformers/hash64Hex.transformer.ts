import { ValueTransformer } from 'typeorm';

export const hash64HexTransformer: ValueTransformer = {
  to: (value: string | null): Buffer | null => {
    if (value === null || value === undefined) {
      return null;
    }
    // Remove 0x prefix if present
    const cleanHex = value.startsWith('0x') ? value.slice(2) : value;

    // Validate that it's a 64-character hex string (32 bytes)
    if (cleanHex.length !== 64) {
      throw new Error(
        `Invalid hash length: expected 64 characters, got ${cleanHex.length}`
      );
    }

    return Buffer.from(cleanHex, 'hex');
  },
  from: (value: Buffer | null): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return '0x' + value.toString('hex');
  },
};
