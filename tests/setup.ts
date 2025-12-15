import 'reflect-metadata';

// TypeORM is now mocked via __mocks__/typeorm.js

// Global test setup
beforeAll(() => {
  // Mock console methods to reduce test output noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global mocks for environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.ENABLE_FILE_LOGGING = 'false';

// Mock database connection for tests
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.DATABASE_NAME = 'test_db';

// Mock required environment variables
process.env.ETHEREUM_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.VIA_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567891';
process.env.RELAYER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
process.env.ETH_URL = 'http://localhost:8545';
process.env.VIA_URL = 'http://localhost:8546';