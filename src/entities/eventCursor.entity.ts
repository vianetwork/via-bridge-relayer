import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { bigIntNumberTransformer } from '../transformers/bigIntNumber.transformer';

@Entity({ name: 'event_cursors' })
export class EventCursor extends BaseEntity<string> {
    @PrimaryColumn()
    public readonly eventName!: string;

    @Column({ type: 'bigint', transformer: bigIntNumberTransformer, default: 0 })
    public readonly lastProcessedVid!: number;

    @UpdateDateColumn()
    public readonly updatedAt!: Date;
}
