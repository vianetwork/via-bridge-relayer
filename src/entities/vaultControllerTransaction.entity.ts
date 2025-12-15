import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { hash64HexTransformer } from '../transformers/hash64Hex.transformer';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';
import { Transaction } from './transactions.entity';

export enum VaultControllerTransactionStatus {
  Pending = 0,
  Confirmed = 1,
  Failed = 2,
  ReadyToClaim = 3,
}

@Entity({ name: 'vault_controller_transactions' })
export class VaultControllerTransaction extends BaseEntity {
  @Column({ type: 'bytea', transformer: hash64HexTransformer })
  @Index()
  public readonly transactionHash!: string;

  @Column({ type: 'bigint', transformer: bigIntNumberTransformer })
  @Index()
  public readonly l1BatchNumber!: number;

  @Column({ type: 'numeric' })
  public readonly totalShares!: string;

  @Column({ type: 'int' })
  public readonly messageHashCount!: number;

  @Column({ type: 'int', default: VaultControllerTransactionStatus.Pending })
  @Index()
  public readonly status!: VaultControllerTransactionStatus;

  @OneToMany(() => Transaction, tx => tx.vaultControllerTransaction)
  public readonly transactions!: Transaction[];
}
