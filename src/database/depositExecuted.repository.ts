import { DepositExecuted } from '../entities/depositExecuted.entity';
import { GraphBaseRepository } from './base.repository';

export class DepositExecutedRepository extends GraphBaseRepository<DepositExecuted> {
    constructor() {
        super(DepositExecuted);
    }

    async findByNonce(nonce: number): Promise<DepositExecuted | null> {
        const repository = this.getRepository();
        return await repository.findOne({ where: { nonce } });
    }

    async getEventsSinceBlock(
        lastBlock: number,
        safeBlock: number,
        limit: number
    ): Promise<DepositExecuted[]> {
        const repository = this.getRepository();
        return await repository
            .createQueryBuilder('event')
            .where('event.blockNumber > :lastBlock', { lastBlock })
            .andWhere('event.blockNumber <= :safeBlock', { safeBlock })
            .orderBy('event.blockNumber', 'ASC')
            .limit(limit)
            .getMany();
    }
}
