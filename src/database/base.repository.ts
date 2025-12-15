import {
  DataSource,
  Repository,
  FindOptionsSelect,
  FindOptionsWhere,
  DeepPartial,
  FindOptionsOrder,
  ObjectLiteral,
} from 'typeorm';
import { relayerDataSource, graphDataSource } from './typeorm.config';

// Track disconnect state per DataSource
const dataSourceDisconnectState = new Map<DataSource, {
  isDisconnecting: boolean;
  disconnectPromise: Promise<void> | null;
}>();

export abstract class BaseRepository<T extends ObjectLiteral> {
  protected dataSource: DataSource;
  protected repository!: Repository<T>;
  protected isConnected: boolean = false;

  constructor(
    private entityClass: new () => T,
    dataSource: DataSource
  ) {
    this.dataSource = dataSource;
    // Initialize disconnect state for this DataSource if not exists
    if (!dataSourceDisconnectState.has(dataSource)) {
      dataSourceDisconnectState.set(dataSource, {
        isDisconnecting: false,
        disconnectPromise: null,
      });
    }
  }

  async connect(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      this.repository = this.dataSource.getRepository(this.entityClass);
      this.isConnected = true;
    } catch (error) {
      const isTestEnvironment = process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined ||
        typeof (global as any).describe === 'function';

      if (!isTestEnvironment) {
        console.error('❌ Database connection failed:', error);
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;

    const state = dataSourceDisconnectState.get(this.dataSource);
    if (!state) return;

    // If disconnect is already in progress, wait for it to complete
    if (state.disconnectPromise) {
      return state.disconnectPromise;
    }

    // If already disconnecting or DataSource not initialized, skip
    if (state.isDisconnecting || !this.dataSource.isInitialized) {
      return;
    }

    state.isDisconnecting = true;
    state.disconnectPromise = this.dataSource.destroy()
      .catch((error) => {
        console.error('❌ Error disconnecting from database:', error);
      })
      .finally(() => {
        state.isDisconnecting = false;
        state.disconnectPromise = null;
      });

    return state.disconnectPromise;
  }

  isDbConnected(): boolean {
    return this.isConnected;
  }

  getRepository(): Repository<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.repository;
  }

  // Basic CRUD operations
  async create(data: DeepPartial<T>): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      console.error('❌ Error creating entity:', error);
      throw error;
    }
  }

  async findById(id: string | number): Promise<T | null> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      return await this.repository.findOne({ where: { id } as any });
    } catch (error) {
      console.error('❌ Error finding entity by ID:', error);
      throw error;
    }
  }

  async findMany(
    findOptions: FindOptionsWhere<T> = {},
    select?: FindOptionsSelect<T>,
    limit?: number,
    order?: FindOptionsOrder<T>
  ): Promise<T[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.repository.find({
        where: findOptions,
        select,
        take: limit,
        order,
      });
      return result;
    } catch (error) {
      console.error('❌ Error finding entities:', error);
      throw error;
    }
  }

  async update(id: string | number, data: DeepPartial<T>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.repository.update(id, data as any);
    } catch (error) {
      console.error('❌ Error updating entity:', error);
      throw error;
    }
  }

  async delete(id: string | number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.repository.delete(id);
    } catch (error) {
      console.error('❌ Error deleting entity:', error);
      throw error;
    }
  }

  async count(findOptions: FindOptionsWhere<T> = {}): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      return await this.repository.count({ where: findOptions });
    } catch (error) {
      console.error('❌ Error counting entities:', error);
      throw error;
    }
  }
}

/**
 * Base repository for relayer entities (transactions, event cursors, etc.)
 * Uses the relayer DataSource which supports read/write and migrations.
 */
export abstract class RelayerBaseRepository<T extends ObjectLiteral> extends BaseRepository<T> {
  constructor(entityClass: new () => T) {
    super(entityClass, relayerDataSource);
  }
}

/**
 * Base repository for graph entities (subgraph data)
 * Uses the graph DataSource which is read-only with no migrations.
 */
export abstract class GraphBaseRepository<T extends ObjectLiteral> extends BaseRepository<T> {
  constructor(entityClass: new () => T) {
    super(entityClass, graphDataSource);
  }
}
