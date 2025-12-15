import { createDatabase } from 'typeorm-extension';
import { typeOrmModuleOptions } from '../src/database/typeorm.config';
import logger from '../src/utils/logger';

async function main() {
  try {
    await createDatabase({
      ifNotExist: true,
      synchronize: false,
      options: typeOrmModuleOptions,
    });
    logger.info(`Database ${typeOrmModuleOptions.database} created.`);
  } catch (error) {
    logger.error('Error creating database:', error);
    process.exit(1);
  }
}

main();
