import { Entity, Column, PrimaryColumn } from 'typeorm';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity({ name: 'deposit_executed', schema: process.env.L2_GRAPH_SCHEMA, synchronize: false })
export class DepositExecuted {
    @PrimaryColumn({ type: 'text' })
    public readonly id!: string;

    @Column({ type: 'numeric', transformer: bigIntNumberTransformer })
    public readonly nonce!: number;

    @Column({ type: 'bytea', transformer: hexTransformer })
    public readonly vault!: string;

    @Column({ type: 'bytea', transformer: hexTransformer })
    public readonly user!: string;

    @Column({ type: 'numeric', transformer: bigIntNumberTransformer })
    public readonly shares!: number;

    @Column({ type: 'bigint', transformer: bigIntNumberTransformer, name: 'block_number' })
    public readonly blockNumber!: number;

    @Column({ type: 'bytea', transformer: hexTransformer, name: 'transaction_hash' })
    public readonly transactionHash!: string;
}
