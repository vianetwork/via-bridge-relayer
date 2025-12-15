import { ValueTransformer } from 'typeorm';

export const bigIntNumberTransformer: ValueTransformer = {
  to: (value: number | bigint | string | null): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  },
  from: (value: string | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return Number(value);
  },
};
