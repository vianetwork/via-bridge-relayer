import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { hash64HexTransformer } from '../transformers/hash64Hex.transformer';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';
import { hexTransformer } from '../transformers/hex.transformer';
import { BridgeOrigin } from '../types/types';
import type { VaultControllerTransaction } from './vaultControllerTransaction.entity';

export enum TransactionStatus {
  New = 0,
  Pending = 1,
  Finalized = 2,
  Failed = 3,
  Refunded = 4,
  L1BatchFinalized = 5,
  VaultUpdated = 6,
}

@Entity({ name: 'transactions' })
export class Transaction extends BaseEntity {

  @Column({ type: 'int', default: BridgeOrigin.Ethereum }) // Assuming default or nullable, but enforcing here
  public readonly origin!: BridgeOrigin;

  @Column({ type: 'int', default: TransactionStatus.Pending })
  @Index()
  public readonly status!: TransactionStatus;

  @Column({ type: 'bytea', transformer: hash64HexTransformer })
  @Index()
  public readonly bridgeInitiatedTransactionHash!: string;

  @Column({
    type: 'bytea',
    transformer: hash64HexTransformer,
  })
  @Index()
  public readonly finalizedTransactionHash!: string;

  @Column({
    type: 'bigint',
    transformer: bigIntNumberTransformer,
    nullable: true,
  })
  @Index()
  public readonly blockNumber?: number;

  @Column({
    type: 'bigint',
    transformer: bigIntNumberTransformer,
    nullable: true,
  })
  @Index()
  public readonly originBlockNumber?: number;

  @Column({
    type: 'bigint',
    transformer: bigIntNumberTransformer,
    nullable: true,
  })
  @Index()
  public readonly l1BatchNumber?: number;

  @Column({ type: 'bytea', transformer: hexTransformer, nullable: true })
  public readonly payload!: string;

  @Column({ type: 'text', name: 'event_type', nullable: true })
  public readonly eventType?: string;

  @Column({ type: 'text', name: 'subgraph_id', nullable: true })
  @Index()
  public readonly subgraphId?: string;

  @ManyToOne('VaultControllerTransaction', 'transactions', { nullable: true })
  @JoinColumn({ name: 'vault_controller_transaction_id' })
  public readonly vaultControllerTransaction?: VaultControllerTransaction;
}
