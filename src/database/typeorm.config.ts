import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { ENTITIES, RELAYER_ENTITIES, GRAPH_ENTITIES } from '../entities';

config();

// Build relayer database URL
function getRelayerDbUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.DATABASE_PORT || '5432');
  const username = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgres';
  const database = process.env.DATABASE_NAME || 'via_relayer';
  return `postgres://${username}:${password}@${host}:${port}/${database}`;
}

// Build graph database URL (falls back to relayer DB settings if not configured)
function getGraphDbUrl(): string {
  if (process.env.GRAPH_DATABASE_URL) {
    return process.env.GRAPH_DATABASE_URL;
  }
  const host = process.env.GRAPH_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.GRAPH_DATABASE_PORT || process.env.DATABASE_PORT || '5432');
  const username = process.env.GRAPH_DATABASE_USER || process.env.DATABASE_USER || 'postgres';
  const password = process.env.GRAPH_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || 'postgres';
  const database = process.env.GRAPH_DATABASE_NAME || process.env.DATABASE_NAME || 'via_relayer';
  return `postgres://${username}:${password}@${host}:${port}/${database}`;
}

const relayerDbUrl = getRelayerDbUrl();
const graphDbUrl = getGraphDbUrl();

// Relayer DataSource configuration
export const relayerDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: relayerDbUrl,
  poolSize: parseInt(process.env.DATABASE_CONNECTION_POOL_SIZE || '100'),
  extra: {
    idleTimeoutMillis: parseInt(
      process.env.DATABASE_CONNECTION_IDLE_TIMEOUT_MS || '12000'
    ),
  },
  applicationName: 'via-bridge-relayer',
  migrationsRun: false,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  subscribers: [],
  migrations: ['dist/migrations/*.js'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

// Graph DataSource configuration (read-only, no migrations, no synchronize)
export const graphDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: graphDbUrl,
  poolSize: parseInt(process.env.GRAPH_DATABASE_CONNECTION_POOL_SIZE || '50'),
  extra: {
    idleTimeoutMillis: parseInt(
      process.env.DATABASE_CONNECTION_IDLE_TIMEOUT_MS || '12000'
    ),
  },
  applicationName: 'via-bridge-relayer-graph',
  migrationsRun: false,
  synchronize: false, // Never synchronize graph DB - it's managed externally
  logging: process.env.NODE_ENV === 'development',
  subscribers: [],
  migrations: [],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

// Legacy export for backwards compatibility (uses relayer config)
export const typeOrmModuleOptions: DataSourceOptions = relayerDataSourceOptions;

// Relayer DataSource - for relayer entities (transactions, event cursors, etc.)
export const relayerDataSource = new DataSource({
  ...relayerDataSourceOptions,
  entities: RELAYER_ENTITIES,
  migrations: ['src/migrations/*.ts'],
});

// Graph DataSource - for graph entities (subgraph data)
export const graphDataSource = new DataSource({
  ...graphDataSourceOptions,
  entities: GRAPH_ENTITIES,
});

// Legacy default export for TypeORM CLI compatibility (uses relayer DataSource)
const typeOrmCliDataSource = relayerDataSource;

export default typeOrmCliDataSource;
