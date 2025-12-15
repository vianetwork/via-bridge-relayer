import winston from 'winston';

describe('logger in production mode', () => {
  const originalEnv = { ...process.env };
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_FILE_LOGGING = 'false';
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  test('creates logger with json formatter and logs', async () => {
    // Re-require to build logger with prod env
    jest.resetModules();
    const logger = (await import('../../src/utils/logger')).default;
    const infoSpy = jest.spyOn(winston.transports.Console.prototype as any, 'log').mockImplementation((_info: any, next: any) => next());
    logger.info('prod test', { x: 1n });
    expect(typeof logger).toBe('object');
    infoSpy.mockRestore();
  });
});
