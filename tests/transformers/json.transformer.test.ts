import { jsonTransformer } from '../../src/transformers/json.transformer';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  log: {
    error: jest.fn(),
  },
}));

describe('jsonTransformer', () => {
  describe('to method (to database)', () => {
    it('should convert object to JSON string', () => {
      const obj = { name: 'test', value: 123 };
      const result = jsonTransformer.to(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should convert array to JSON string', () => {
      const arr = [1, 2, 3, 'test'];
      const result = jsonTransformer.to(arr);
      expect(result).toBe('[1,2,3,"test"]');
    });

    it('should convert string to JSON string', () => {
      const str = 'hello world';
      const result = jsonTransformer.to(str);
      expect(result).toBe('"hello world"');
    });

    it('should convert number to JSON string', () => {
      const num = 42;
      const result = jsonTransformer.to(num);
      expect(result).toBe('42');
    });

    it('should convert boolean to JSON string', () => {
      expect(jsonTransformer.to(true)).toBe('true');
      expect(jsonTransformer.to(false)).toBe('false');
    });

    it('should handle null and undefined values', () => {
      expect(jsonTransformer.to(null)).toBeNull();
      expect(jsonTransformer.to(undefined)).toBeNull();
    });

    it('should handle nested objects', () => {
      const nestedObj = {
        user: {
          name: 'John',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [1, 2, 3],
      };
      const result = jsonTransformer.to(nestedObj);
      expect(result).toBe(JSON.stringify(nestedObj));
    });

    it('should handle empty objects and arrays', () => {
      expect(jsonTransformer.to({})).toBe('{}');
      expect(jsonTransformer.to([])).toBe('[]');
    });

    it('should handle special values', () => {
      expect(jsonTransformer.to(0)).toBe('0');
      expect(jsonTransformer.to('')).toBe('""');
      expect(jsonTransformer.to(NaN)).toBe('null');
      expect(jsonTransformer.to(Infinity)).toBe('null');
      expect(jsonTransformer.to(-Infinity)).toBe('null');
    });
  });

  describe('from method (from database)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should convert JSON string to object', () => {
      const jsonStr = '{"name":"test","value":123}';
      const result = jsonTransformer.from(jsonStr);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should convert JSON string to array', () => {
      const jsonStr = '[1,2,3,"test"]';
      const result = jsonTransformer.from(jsonStr);
      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('should convert JSON string to primitive values', () => {
      expect(jsonTransformer.from('"hello world"')).toBe('hello world');
      expect(jsonTransformer.from('42')).toBe(42);
      expect(jsonTransformer.from('true')).toBe(true);
      expect(jsonTransformer.from('false')).toBe(false);
      expect(jsonTransformer.from('null')).toBeNull();
    });

    it('should handle null and undefined values', () => {
      expect(jsonTransformer.from(null)).toBeNull();
      expect(jsonTransformer.from(undefined)).toBeNull();
    });

    it('should handle empty objects and arrays', () => {
      expect(jsonTransformer.from('{}')).toEqual({});
      expect(jsonTransformer.from('[]')).toEqual([]);
    });

    it('should handle nested objects', () => {
      const nestedObj = {
        user: {
          name: 'John',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [1, 2, 3],
      };
      const jsonStr = JSON.stringify(nestedObj);
      const result = jsonTransformer.from(jsonStr);
      expect(result).toEqual(nestedObj);
    });

    it('should handle invalid JSON and return null', () => {
      const invalidJson = '{"invalid": json}';
      const result = jsonTransformer.from(invalidJson);
      expect(result).toBeNull();
    });

    it('should log error for invalid JSON', () => {
      const { log } = require('../../src/utils/logger');
      const invalidJson = '{"invalid": json}';
      jsonTransformer.from(invalidJson);
      expect(log.error).toHaveBeenCalledWith('Error parsing JSON in transformer:', expect.any(Error));
    });

    it('should handle malformed JSON strings', () => {
      const malformedCases = [
        '{"missing": quote}',
        '{invalid: "json"}',
        '[1,2,3,]',
        '{"trailing": "comma",}',
        'undefined',
        'function() {}',
        'new Date()',
      ];

      malformedCases.forEach((malformed) => {
        const result = jsonTransformer.from(malformed);
        expect(result).toBeNull();
      });
    });

    it('should handle empty string', () => {
      const result = jsonTransformer.from('');
      expect(result).toBeNull();
    });

    it('should handle special JSON values', () => {
      expect(jsonTransformer.from('0')).toBe(0);
      expect(jsonTransformer.from('""')).toBe('');
      expect(jsonTransformer.from('null')).toBeNull();
    });
  });

  describe('roundtrip conversion', () => {
    it('should handle object roundtrip', () => {
      const original = { name: 'test', value: 123, active: true };
      const converted = jsonTransformer.to(original);
      const restored = jsonTransformer.from(converted);
      expect(restored).toEqual(original);
    });

    it('should handle array roundtrip', () => {
      const original = [1, 'test', true, null, { nested: 'object' }];
      const converted = jsonTransformer.to(original);
      const restored = jsonTransformer.from(converted);
      expect(restored).toEqual(original);
    });

    it('should handle primitive roundtrip', () => {
      const primitives = ['hello', 42, true, false];
      
      primitives.forEach((original) => {
        const converted = jsonTransformer.to(original);
        const restored = jsonTransformer.from(converted);
        expect(restored).toBe(original);
      });
    });

    it('should handle null roundtrip', () => {
      const original = null;
      const converted = jsonTransformer.to(original);
      const restored = jsonTransformer.from(converted);
      expect(restored).toBe(original);
    });

    it('should handle complex nested structure roundtrip', () => {
      const original = {
        metadata: {
          version: '1.0.0',
          timestamp: 1234567890,
          enabled: true,
        },
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        settings: {
          theme: 'dark',
          preferences: {
            autoSave: true,
            notifications: false,
          },
        },
      };
      
      const converted = jsonTransformer.to(original);
      const restored = jsonTransformer.from(converted);
      expect(restored).toEqual(original);
    });
  });
});