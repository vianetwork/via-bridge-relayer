import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity({ name: 'message_sent', schema: process.env.L1_GRAPH_SCHEMA, synchronize: false })
export class L1MessageSent {
    @PrimaryColumn({ type: 'text' })
    public readonly id!: string;

    @Column({ type: 'bytea', transformer: hexTransformer })
    public readonly payload!: string;

    @Column({ type: 'bigint', transformer: bigIntNumberTransformer, name: 'block_number' })
    @Index()
    public readonly blockNumber!: number;

    @Column({ type: 'bigint', transformer: bigIntNumberTransformer, name: 'block_timestamp' })
    public readonly blockTimestamp!: number;

    @Column({ type: 'bytea', transformer: hexTransformer, name: 'transaction_hash' })
    public readonly transactionHash!: string;
}
