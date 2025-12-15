import { Service } from 'typedi';
import { RelayerBaseRepository } from './base.repository';
import { EventCursor } from '../entities/eventCursor.entity';
import logger from '../utils/logger';

@Service()
export class EventCursorRepository extends RelayerBaseRepository<EventCursor> {
    constructor() {
        super(EventCursor);
    }

    public async getCursor(eventName: string): Promise<number> {
        const cursor = await this.findById(eventName);
        return cursor ? cursor.lastProcessedVid : 0;
    }

    public async updateCursor(eventName: string, lastProcessedVid: number): Promise<void> {
        const currentVid = await this.getCursor(eventName);

        // Ensure we only move forward
        if (lastProcessedVid <= currentVid && currentVid !== 0) {
            return;
        }

        try {
            await this.repository.save({
                eventName,
                lastProcessedVid,
            } as any);
            logger.info(`Updated cursor for ${eventName} to vid: ${lastProcessedVid}`);
        } catch (error) {
            logger.error(`Failed to update cursor for ${eventName}:`, error);
            throw error;
        }
    }

    // Helper method to satisfy BaseRepository abstract method if needed, 
    // though findById uses 'id' which here is 'eventName' (string ID).
    // BaseRepository implementation of findById uses `where: { id: id }`.
    // Since EventCursor has @PrimaryColumn() eventName, TypeORM might need valid mapping.
    // Actually BaseRepository expects `id` property on entity if using findById specific logic,
    // or it relies on metadata.
    // Let's ensure findById works for PrimaryColumn that is not named 'id'.
    // Looking at BaseRepository (viewed previously), it uses:
    // findOne({ where: { id } as any })
    // This implies the entity MUST have an 'id' column or we override findById.

    public override async findById(id: string): Promise<EventCursor | null> {
        if (!this.isConnected) throw new Error('Database not connected');
        try {
            return await this.repository.findOne({ where: { eventName: id } as any });
        } catch (error) {
            logger.error('❌ Error finding entity by ID:', error);
            throw error;
        }
    }
}
