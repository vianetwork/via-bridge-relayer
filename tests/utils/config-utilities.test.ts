
describe('Config Utilities', () => {
  let getEnvVar: any;
  let getEnvString: any;
  let getEnvNumber: any;
  let getRequiredEnvVar: any;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Set minimal valid env to prevent module-level instantiation crash
    process.env.ETHEREUM_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.VIA_BRIDGE_ADDRESS = '0x1234567890123456789012345678901234567891';
    process.env.RELAYER_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';

    // Require the module
    const configModule = require('../../src/utils/config');
    getEnvVar = configModule.getEnvVar;
    getEnvString = configModule.getEnvString;
    getEnvNumber = configModule.getEnvNumber;
    getRequiredEnvVar = configModule.getRequiredEnvVar;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';

      const result = getEnvVar('TEST_VAR');

      expect(result).toBe('test-value');
    });

    it('should return undefined for non-existent variable', () => {
      delete process.env.NON_EXISTENT;

      const result = getEnvVar('NON_EXISTENT');

      expect(result).toBeUndefined();
    });

    it('should handle empty string values', () => {
      process.env.EMPTY_VAR = '';

      const result = getEnvVar('EMPTY_VAR');

      expect(result).toBe('');
    });
  });

  describe('getEnvString', () => {
    it('should return environment variable value', () => {
      process.env.STRING_VAR = 'custom-value';

      const result = getEnvString('STRING_VAR', 'default');

      expect(result).toBe('custom-value');
    });

    it('should return default value when variable is not set', () => {
      delete process.env.MISSING_STRING;

      const result = getEnvString('MISSING_STRING', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should return default value when variable is empty string', () => {
      process.env.EMPTY_STRING = '';

      const result = getEnvString('EMPTY_STRING', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should handle whitespace-only values', () => {
      process.env.WHITESPACE_VAR = '   ';

      const result = getEnvString('WHITESPACE_VAR', 'default');

      expect(result).toBe('   ');
    });
  });

  describe('getEnvNumber', () => {
    it('should return parsed number from environment variable', () => {
      process.env.NUMBER_VAR = '42';

      const result = getEnvNumber('NUMBER_VAR', 100);

      expect(result).toBe(42);
    });

    it('should return default value when variable is not set', () => {
      delete process.env.MISSING_NUMBER;

      const result = getEnvNumber('MISSING_NUMBER', 999);

      expect(result).toBe(999);
    });

    it('should return default value when variable is empty string', () => {
      process.env.EMPTY_NUMBER = '';

      const result = getEnvNumber('EMPTY_NUMBER', 555);

      expect(result).toBe(555);
    });

    it('should parse floating point numbers', () => {
      process.env.FLOAT_VAR = '3.14';

      const result = getEnvNumber('FLOAT_VAR', 0);

      expect(result).toBe(3.14);
    });

    it('should parse negative numbers', () => {
      process.env.NEGATIVE_VAR = '-50';

      const result = getEnvNumber('NEGATIVE_VAR', 0);

      expect(result).toBe(-50);
    });

    it('should handle zero values', () => {
      process.env.ZERO_VAR = '0';

      const result = getEnvNumber('ZERO_VAR', 100);

      expect(result).toBe(0);
    });

    it('should return NaN for invalid number strings but still call Number()', () => {
      process.env.INVALID_NUMBER = 'not-a-number';

      const result = getEnvNumber('INVALID_NUMBER', 100);

      expect(result).toBeNaN();
    });
  });

  describe('getRequiredEnvVar', () => {
    it('should return environment variable value when set', () => {
      process.env.REQUIRED_VAR = 'required-value';

      const result = getRequiredEnvVar('REQUIRED_VAR');

      expect(result).toBe('required-value');
    });

    it('should throw error when variable is not set', () => {
      delete process.env.MISSING_REQUIRED;

      expect(() => getRequiredEnvVar('MISSING_REQUIRED')).toThrow(
        'Required environment variable MISSING_REQUIRED is not set'
      );
    });

    it('should throw error when variable is empty string', () => {
      process.env.EMPTY_REQUIRED = '';

      expect(() => getRequiredEnvVar('EMPTY_REQUIRED')).toThrow(
        'Required environment variable EMPTY_REQUIRED is not set'
      );
    });

    it('should return whitespace-only values', () => {
      process.env.WHITESPACE_REQUIRED = '   ';

      const result = getRequiredEnvVar('WHITESPACE_REQUIRED');

      expect(result).toBe('   ');
    });

    it('should handle special characters', () => {
      process.env.SPECIAL_CHARS = 'value-with_special.chars@123';

      const result = getRequiredEnvVar('SPECIAL_CHARS');

      expect(result).toBe('value-with_special.chars@123');
    });
  });
});