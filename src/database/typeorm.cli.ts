import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { RELAYER_ENTITIES } from '../entities';

config();

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: false,
    logging: true,
    entities: RELAYER_ENTITIES,
    migrations: ['src/migrations/*.ts'],
});
