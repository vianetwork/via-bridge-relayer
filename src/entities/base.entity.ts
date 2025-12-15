import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity<ID = number> {
  @PrimaryGeneratedColumn()
  public readonly id!: ID;

  @CreateDateColumn({ type: 'timestamp' })
  public readonly createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  public readonly updatedAt!: Date;
}
