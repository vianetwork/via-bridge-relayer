import { typeOrmModuleOptions } from '../../src/database/typeorm.config';

describe('typeorm.config', () => {
  test('module options contain expected defaults', () => {
    const options = typeOrmModuleOptions as any;
    expect(options.type).toBe('postgres');
    expect(options.migrationsRun).toBe(false);
    expect(typeof options.synchronize).toBe('boolean');
    expect(typeof options.logging).toBe('boolean');
    expect(options.applicationName).toBe('via-bridge-relayer');
  });
});
