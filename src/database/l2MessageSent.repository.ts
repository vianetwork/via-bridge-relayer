import { L2MessageSent } from '../entities/l2MessageSent.entity';
import { GraphBaseRepository } from './base.repository';

export class L2MessageSentRepository extends GraphBaseRepository<L2MessageSent> {
    constructor() {
        super(L2MessageSent);
    }

    async getEventsSinceBlock(
        lastBlock: number,
        safeBlock: number,
        limit: number = 100
    ): Promise<L2MessageSent[]> {
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
