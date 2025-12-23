
// Mock dotenv before anything else
jest.mock('dotenv', () => ({
  config: jest.fn().mockReturnValue({ parsed: {} }),
}));

describe('AppConfig', () => {
  let AppConfig: any;
  let getEnvString: any;
  let getEnvNumber: any;
  let getRequiredEnvVar: any;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // Reset cache to allow re-importing
    process.env = { ...originalEnv };

    // Set minimal valid env to prevent module-level instantiation crash
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.VIA_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567891';
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x1234567890123456789012345678901234567892';
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x1234567890123456789012345678901234567893';
    process.env.RELAYER_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';

    // Require the module
    const configModule = require('../../src/utils/config');
    AppConfig = configModule.AppConfig;
    getEnvString = configModule.getEnvString;
    getEnvNumber = configModule.getEnvNumber;
    getRequiredEnvVar = configModule.getRequiredEnvVar;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should validate configuration successfully with defaults', () => {
    process.env.RELAYER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x' + '2'.repeat(40);
    process.env.VIA_BRIDGE_ADDRESS = '0x' + '3'.repeat(40);
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '4'.repeat(40);
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '5'.repeat(40);
    process.env.NODE_ENV = 'test';
    // Clear URL env vars to ensure defaults are used
    delete process.env.ETH_URL;
    delete process.env.VIA_URL;

    const config = new AppConfig();
    expect(config).toBeDefined();
    // The defaults are defined in config.ts
    expect(config.ethUrl).toBe('http://host.docker.internal:8545'); // Default
    expect(config.viaUrl).toBe('http://host.docker.internal:8546'); // Default
  });

  test('should load values from environment', () => {
    process.env.ETH_URL = 'http://custom-eth:8545';
    process.env.VIA_URL = 'http://custom-via:8546';
    process.env.RELAYER_PRIVATE_KEY = '0x' + 'a'.repeat(64);
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x' + 'b'.repeat(40);
    process.env.VIA_BRIDGE_ADDRESS = '0x' + 'c'.repeat(40);
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + 'd'.repeat(40);
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + 'e'.repeat(40);
    process.env.NODE_ENV = 'test';

    const config = new AppConfig();
    expect(config.ethUrl).toBe('http://custom-eth:8545');
    expect(config.viaUrl).toBe('http://custom-via:8546');
    expect(config.ethereumBridgeAddress).toBe('0x' + 'b'.repeat(40));
    expect(config.viaBridgeAddress).toBe('0x' + 'c'.repeat(40));
  });

  test('should throw error if required valid private key missing', () => {
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x' + '2'.repeat(40);
    process.env.VIA_BRIDGE_ADDRESS = '0x' + '3'.repeat(40);
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '4'.repeat(40);
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '5'.repeat(40);
    process.env.NODE_ENV = 'test';
    delete process.env.RELAYER_PRIVATE_KEY; // Ensure it's deleted

    expect(() => new AppConfig()).toThrow('Required environment variable RELAYER_PRIVATE_KEY is not set');
  });

  test('should throw if private key invalid', () => {
    process.env.RELAYER_PRIVATE_KEY = 'invalid';
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x' + '2'.repeat(40);
    process.env.VIA_BRIDGE_ADDRESS = '0x' + '3'.repeat(40);
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '4'.repeat(40);
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '5'.repeat(40);
    process.env.NODE_ENV = 'test';

    expect(() => new AppConfig()).toThrow(/RELAYER_PRIVATE_KEY/);
  });

  test('should parse fallback URLs correctly', () => {
    process.env.RELAYER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x' + '2'.repeat(40);
    process.env.VIA_BRIDGE_ADDRESS = '0x' + '3'.repeat(40);
    process.env.L1_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '4'.repeat(40);
    process.env.L2_BRIDGE_MESSAGE_MANAGER_ADDRESS = '0x' + '5'.repeat(40);
    process.env.NODE_ENV = 'test';
    process.env.ETH_FALLBACK_URLS = 'http://fb1.com,http://fb2.com, ';

    const config = new AppConfig();
    expect(config.ethFallbackUrls).toEqual(['http://fb1.com', 'http://fb2.com']);
  });

  test('legacy helpers should work', () => {
    process.env.TEST_VAR = 'test_value';
    process.env.TEST_NUM = '123';

    expect(getEnvString('TEST_VAR', 'default')).toBe('test_value');
    expect(getEnvString('MISSING_VAR', 'default')).toBe('default');
    expect(getEnvNumber('TEST_NUM', 0)).toBe(123);
    expect(getRequiredEnvVar('TEST_VAR')).toBe('test_value');
    expect(() => getRequiredEnvVar('MISSING_VAR')).toThrow();
  });
});