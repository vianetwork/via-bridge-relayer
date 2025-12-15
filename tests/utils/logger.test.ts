import logger from '../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.ENABLE_FILE_LOGGING = 'false';
  });

  test('logs without throwing and serializes BigInt', () => {
    expect(() => {
      logger.info('hello', { a: 1n });
      logger.error('err', { big: 2n });
    }).not.toThrow();
  });
});
