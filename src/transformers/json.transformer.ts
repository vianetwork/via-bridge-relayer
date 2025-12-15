import { ValueTransformer } from 'typeorm';
import { log } from '../utils/logger';

export const jsonTransformer: ValueTransformer = {
  to: (value: any): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.stringify(value);
  },
  from: (value: string | null): any => {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      log.error('Error parsing JSON in transformer:', error);
      return null;
    }
  },
};
