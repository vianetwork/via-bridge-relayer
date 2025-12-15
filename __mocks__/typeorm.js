// Mock TypeORM decorators and classes for Jest tests
const mockDecorator = () => (target, propertyKey) => { };
const mockClassDecorator = () => (target) => target;

module.exports = {
  // Entity decorators
  Entity: mockClassDecorator,

  // Column decorators
  PrimaryGeneratedColumn: mockDecorator,
  PrimaryColumn: mockDecorator,
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

  // Additional commonly used classes/functions
  DataSource: jest.fn(),
  Repository: jest.fn(),
  EntityRepository: mockClassDecorator,
  getRepository: jest.fn(),
  createConnection: jest.fn(),
  getConnection: jest.fn(),
  getManager: jest.fn(),

  // Query builder related
  MoreThan: jest.fn(),
  SelectQueryBuilder: jest.fn(),
  UpdateQueryBuilder: jest.fn(),
  DeleteQueryBuilder: jest.fn(),
  InsertQueryBuilder: jest.fn(),
};