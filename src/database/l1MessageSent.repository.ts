import { L1MessageSent } from '../entities/l1MessageSent.entity';
import { GraphBaseRepository } from './base.repository';

export class L1MessageSentRepository extends GraphBaseRepository<L1MessageSent> {
    constructor() {
        super(L1MessageSent);
    }

    async getEventsSinceBlock(
        lastBlock: number,
        safeBlock: number,
        limit: number = 100
    ): Promise<L1MessageSent[]> {
        const repository = this.getRepository();
        return await repository
            .createQueryBuilder('event')
            .where('event.blockNumber >= :lastBlock', { lastBlock })
            .andWhere('event.blockNumber <= :safeBlock', { safeBlock })
            .orderBy('event.blockNumber', 'ASC')
            .addOrderBy('event.id', 'ASC')
            .limit(limit)
            .getMany();
    }
}
