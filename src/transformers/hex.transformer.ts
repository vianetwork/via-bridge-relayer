import { ValueTransformer } from 'typeorm';

export const hexTransformer: ValueTransformer = {
  to: (value: string | null): Buffer | null => {
    if (value === null || value === undefined) {
      return null;
    }
    // Remove 0x prefix if present
    const cleanHex = value.startsWith('0x') ? value.slice(2) : value;
    return Buffer.from(cleanHex, 'hex');
  },
  from: (value: Buffer | null): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return '0x' + value.toString('hex');
  },
};
