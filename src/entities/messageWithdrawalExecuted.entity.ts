import { Entity, Column, PrimaryColumn } from 'typeorm';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity({ name: 'message_withdrawal_executed', schema: process.env.L1_GRAPH_SCHEMA || 'sgd3', synchronize: false })
export class MessageWithdrawalExecuted {
    @PrimaryColumn({ type: 'text' })
    public readonly id!: string;

    @Column({ type: 'numeric', transformer: bigIntNumberTransformer, name: 'vault_nonce' })
    public readonly vaultNonce!: number;

    @Column({ type: 'bytea', transformer: hexTransformer, name: 'l_1_vault' })
    public readonly l1Vault!: string;

    @Column({ type: 'bytea', transformer: hexTransformer })
    public readonly receiver!: string;

    @Column({ type: 'numeric', transformer: bigIntNumberTransformer })
    public readonly shares!: number;

    @Column({ type: 'bigint', transformer: bigIntNumberTransformer, name: 'block_number' })
    public readonly blockNumber!: number;

    @Column({ type: 'bytea', transformer: hexTransformer, name: 'transaction_hash' })
    public readonly transactionHash!: string;
}
