import { BaseRepository } from '../../src/database/base.repository';
import { BaseEntity } from '../../src/entities/base.entity';
import { DataSource, Repository } from 'typeorm';

// Mock TypeORM
jest.mock('typeorm', () => {
  const mockDecorator = () => (target: any, propertyKey?: string) => {};
  const mockClassDecorator = () => (target: any) => target;
  
  return {
    // Entity decorators
    Entity: mockClassDecorator,
    
    // Column decorators
    PrimaryGeneratedColumn: mockDecorator,
    Column: mockDecorator,
    CreateDateColumn: mockDecorator,
    UpdateDateColumn: mockDecorator,
    
    // Index and constraint decorators
    Index: mockDecorator,
    Unique: mockClassDecorator,
    
    // Relationship decorators
    OneToOne: mockDecorator,
    OneToMany: mockDecorator,
    ManyToOne: mockDecorator,
    ManyToMany: mockDecorator,
    JoinColumn: mockDecorator,
    JoinTable: mockDecorator,
    
    // Lifecycle decorators
    BeforeInsert: mockDecorator,
    BeforeUpdate: mockDecorator,
    BeforeRemove: mockDecorator,
    AfterInsert: mockDecorator,
    AfterUpdate: mockDecorator,
    AfterRemove: mockDecorator,
    AfterLoad: mockDecorator,
    
    // Classes and functions
    DataSource: jest.fn(),
    Repository: jest.fn(),
    EntityRepository: mockClassDecorator,
    getRepository: jest.fn(),
    createConnection: jest.fn(),
    getConnection: jest.fn(),
    getManager: jest.fn(),
    
    // Query builder related
    SelectQueryBuilder: jest.fn(),
    UpdateQueryBuilder: jest.fn(),
    DeleteQueryBuilder: jest.fn(),
    InsertQueryBuilder: jest.fn(),
  };
});

// Mock typeorm config
jest.mock('../../src/database/typeorm.config', () => ({
  __esModule: true,
  default: {
    isInitialized: false,
    initialize: jest.fn(),
    destroy: jest.fn(),
    getRepository: jest.fn(),
  },
}));

// Create a concrete test class
class TestEntity extends BaseEntity {
  public name: string = 'test';
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor() {
    super(TestEntity);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockDataSource: any;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    mockDataSource = {
      isInitialized: false,
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    // Mock the imported datasource
    const typeOrmConfig = require('../../src/database/typeorm.config');
    Object.assign(typeOrmConfig.default, mockDataSource);

    repository = new TestRepository();
    
    // Clear mocks after setup to avoid clearing setup calls
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with entity class and datasource', () => {
      expect(repository).toBeInstanceOf(BaseRepository);
      expect(repository['entityClass']).toBe(TestEntity);
      expect(repository['isConnected']).toBe(false);
    });
  });

  describe('connect', () => {
    it('should initialize datasource and set repository when not initialized', async () => {
      mockDataSource.isInitialized = false;

      await repository.connect();

      expect(mockDataSource.initialize).toHaveBeenCalled();
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestEntity);
      expect(repository['isConnected']).toBe(true);
      expect(repository['repository']).toBe(mockRepository);
    });

    it('should not initialize datasource when already initialized', async () => {
      // Override the read-only isInitialized property
      Object.defineProperty(repository['dataSource'], 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });

      await repository.connect();

      expect(mockDataSource.initialize).not.toHaveBeenCalled();
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(TestEntity);
      expect(repository['isConnected']).toBe(true);
    });

    it('should throw error when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockDataSource.initialize.mockRejectedValue(connectionError);

      await expect(repository.connect()).rejects.toThrow('Connection failed');
      expect(repository['isConnected']).toBe(false);
    });

    it('should not log error in test environment when connection fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const connectionError = new Error('Connection failed');
      mockDataSource.initialize.mockRejectedValue(connectionError);

      await expect(repository.connect()).rejects.toThrow();
      // In test environment, console.error should NOT be called to keep output clean
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should destroy datasource when initialized', async () => {
      // Override the read-only isInitialized property
      Object.defineProperty(repository['dataSource'], 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });

      await repository.disconnect();

      expect(mockDataSource.destroy).toHaveBeenCalled();
      expect(repository['isConnected']).toBe(false);
    });

    it('should not destroy datasource when not initialized', async () => {
      // Override the read-only isInitialized property
      Object.defineProperty(repository['dataSource'], 'isInitialized', {
        value: false,
        writable: true,
        configurable: true
      });

      await repository.disconnect();

      expect(mockDataSource.destroy).not.toHaveBeenCalled();
      expect(repository['isConnected']).toBe(false);
    });

    it('should handle disconnect errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const disconnectError = new Error('Disconnect failed');
      
      // Override the read-only isInitialized property
      Object.defineProperty(repository['dataSource'], 'isInitialized', {
        value: true,
        writable: true,
        configurable: true
      });
      mockDataSource.destroy.mockRejectedValue(disconnectError);

      await repository.disconnect();

      expect(consoleSpy).toHaveBeenCalledWith('❌ Error disconnecting from database:', disconnectError);
      expect(repository['isConnected']).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('isDbConnected', () => {
    it('should return false when not connected', () => {
      expect(repository.isDbConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      await repository.connect();
      expect(repository.isDbConnected()).toBe(true);
    });
  });

  describe('getRepository', () => {
    it('should return repository when connected', async () => {
      await repository.connect();
      
      const result = repository.getRepository();
      
      expect(result).toBe(mockRepository);
    });

    it('should throw error when not connected', () => {
      expect(() => repository.getRepository()).toThrow('Database not connected');
    });
  });

  describe('create', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should create and save entity', async () => {
      const data = { name: 'test entity' };
      const createdEntity = { id: 1, ...data };
      const savedEntity = { id: 1, ...data, createdAt: new Date() };

      mockRepository.create.mockReturnValue(createdEntity);
      mockRepository.save.mockResolvedValue(savedEntity);

      const result = await repository.create(data);

      expect(mockRepository.create).toHaveBeenCalledWith(data);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toBe(savedEntity);
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.create({ name: 'test' })).rejects.toThrow('Database not connected');
    });

    it('should handle save errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const saveError = new Error('Save failed');
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(saveError);

      await expect(repository.create({ name: 'test' })).rejects.toThrow('Save failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error creating entity:', saveError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('findById', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should find entity by id', async () => {
      const entity = { id: 1, name: 'test' };
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await repository.findById(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(entity);
    });

    it('should return null when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.findById(1)).rejects.toThrow('Database not connected');
    });

    it('should handle find errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const findError = new Error('Find failed');
      mockRepository.findOne.mockRejectedValue(findError);

      await expect(repository.findById(1)).rejects.toThrow('Find failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error finding entity by ID:', findError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should find entities with default options', async () => {
      const entities = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
      mockRepository.find.mockResolvedValue(entities);

      const result = await repository.findMany();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {},
        select: undefined,
        take: undefined,
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(entities);
    });

    it('should find entities with custom options', async () => {
      const entities = [{ id: 1, name: 'test1' }];
      const whereOptions = { name: 'test1' };
      const selectOptions = { id: true, name: true };
      const orderOptions = { name: 'ASC' as any };
      
      mockRepository.find.mockResolvedValue(entities);

      const result = await repository.findMany(whereOptions, selectOptions, 10, orderOptions);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: whereOptions,
        select: selectOptions,
        take: 10,
        order: orderOptions,
      });
      expect(result).toBe(entities);
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.findMany()).rejects.toThrow('Database not connected');
    });

    it('should handle find errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const findError = new Error('Find failed');
      mockRepository.find.mockRejectedValue(findError);

      await expect(repository.findMany()).rejects.toThrow('Find failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error finding entities:', findError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should update entity', async () => {
      const updateData = { name: 'updated' };
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await repository.update(1, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateData);
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.update(1, { name: 'test' })).rejects.toThrow('Database not connected');
    });

    it('should handle update errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const updateError = new Error('Update failed');
      mockRepository.update.mockRejectedValue(updateError);

      await expect(repository.update(1, { name: 'test' })).rejects.toThrow('Update failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error updating entity:', updateError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should delete entity', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await repository.delete(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.delete(1)).rejects.toThrow('Database not connected');
    });

    it('should handle delete errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const deleteError = new Error('Delete failed');
      mockRepository.delete.mockRejectedValue(deleteError);

      await expect(repository.delete(1)).rejects.toThrow('Delete failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error deleting entity:', deleteError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should count entities with default options', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(mockRepository.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toBe(5);
    });

    it('should count entities with where conditions', async () => {
      const whereOptions = { name: 'test' };
      mockRepository.count.mockResolvedValue(3);

      const result = await repository.count(whereOptions);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: whereOptions });
      expect(result).toBe(3);
    });

    it('should throw error when not connected', async () => {
      await repository.disconnect();

      await expect(repository.count()).rejects.toThrow('Database not connected');
    });

    it('should handle count errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const countError = new Error('Count failed');
      mockRepository.count.mockRejectedValue(countError);

      await expect(repository.count()).rejects.toThrow('Count failed');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error counting entities:', countError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('abstract class behavior', () => {
    it('should be extendable by concrete classes', () => {
      expect(repository).toBeInstanceOf(TestRepository);
      expect(repository).toBeInstanceOf(BaseRepository);
    });

    it('should be marked as abstract in TypeScript', () => {
      // BaseRepository is abstract in TypeScript but can be instantiated in JavaScript
      // This test verifies the class exists and can be extended
      // @ts-ignore - testing runtime behavior
      const instance = new BaseRepository(TestEntity);
      expect(instance).toBeDefined();
      expect(instance.constructor.name).toBe('BaseRepository');
    });
  });

  describe('error handling consistency', () => {
    it('should consistently throw "Database not connected" errors', async () => {
      const methods = [
        () => repository.create({ name: 'test' }),
        () => repository.findById(1),
        () => repository.findMany(),
        () => repository.update(1, { name: 'test' }),
        () => repository.delete(1),
        () => repository.count(),
      ];

      for (const method of methods) {
        await expect(method()).rejects.toThrow('Database not connected');
      }
    });

    it('should handle repository access correctly', async () => {
      expect(() => repository.getRepository()).toThrow('Database not connected');
      
      await repository.connect();
      expect(repository.getRepository()).toBe(mockRepository);
    });
  });
});