import { MessageWithdrawalExecuted } from '../entities/messageWithdrawalExecuted.entity';
import { GraphBaseRepository } from './base.repository';
import { IMessageWithdrawalExecutedRepository } from './interfaces';

export class MessageWithdrawalExecutedRepository extends GraphBaseRepository<MessageWithdrawalExecuted> implements IMessageWithdrawalExecutedRepository {
    constructor() {
        super(MessageWithdrawalExecuted);
    }

    async findByNonce(vaultNonce: number): Promise<MessageWithdrawalExecuted | null> {
        const repository = this.getRepository();
        return await repository.findOne({ where: { vaultNonce } });
    }

    async getEventsSinceBlock(
        lastBlock: number,
        safeBlock: number,
        limit: number
    ): Promise<MessageWithdrawalExecuted[]> {
        const repository = this.getRepository();
        return await repository
            .createQueryBuilder('event')
            .where('event.blockNumber > :lastBlock', { lastBlock })
            .andWhere('event.blockNumber <= :safeBlock', { safeBlock })
            .orderBy('event.blockNumber', 'ASC')
            .limit(limit)
            .getMany();
    }

    async getEventsByTransactionHashes(
        transactionHashes: string[]
    ): Promise<MessageWithdrawalExecuted[]> {
        if (transactionHashes.length === 0) return [];
        
        const repository = this.getRepository();
        const schema = process.env.L1_GRAPH_SCHEMA;
        
        const byteaHashes = transactionHashes.map(hash => {
            const cleanHex = hash.startsWith('0x') ? hash.slice(2) : hash;
            return `'\\x${cleanHex}'::bytea`;
        });
        
        const query = `
            SELECT 
                id,
                vault_nonce as "vaultNonce",
                l_1_vault as "l1Vault",
                receiver,
                shares,
                block_number as "blockNumber",
                transaction_hash as "transactionHash"
            FROM "${schema}"."message_withdrawal_executed"
            WHERE "transaction_hash" IN (${byteaHashes.join(', ')})
        `;
        
        const rawResults = await repository.query(query);
        
        // Transform the raw results to match entity format
        return rawResults.map((row: any) => ({
            id: row.id,
            vaultNonce: Number(row.vaultNonce),
            l1Vault: '0x' + row.l1Vault.toString('hex'),
            receiver: '0x' + row.receiver.toString('hex'),
            shares: Number(row.shares),
            blockNumber: Number(row.blockNumber),
            transactionHash: '0x' + row.transactionHash.toString('hex')
        })) as MessageWithdrawalExecuted[];
    }
}
