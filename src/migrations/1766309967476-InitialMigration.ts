import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1766309967476 implements MigrationInterface {
    name = 'InitialMigration1766309967476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transactions" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "origin" integer NOT NULL DEFAULT '0', "status" integer NOT NULL DEFAULT '1', "bridgeInitiatedTransactionHash" bytea NOT NULL, "finalizedTransactionHash" bytea NOT NULL, "blockNumber" bigint, "originBlockNumber" bigint, "l1BatchNumber" bigint, "payload" bytea, "event_type" text, "subgraph_id" text, "vault_controller_transaction_id" integer, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_6264a760ae26b2449eeba11f8e" ON "transactions" ("bridgeInitiatedTransactionHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_fda61b413a16cbfc74abf0b149" ON "transactions" ("finalizedTransactionHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_a629587e749dda5721fed9a5c3" ON "transactions" ("blockNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_40e47b149aa922ee1c868770c0" ON "transactions" ("originBlockNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_41d0949231626ebf9c26fc2aff" ON "transactions" ("l1BatchNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_ee4051e8b995251a6ce2e57013" ON "transactions" ("subgraph_id") `);
        await queryRunner.query(`CREATE TABLE "event_cursors" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "eventName" character varying NOT NULL, "lastProcessedVid" bigint NOT NULL DEFAULT '0', CONSTRAINT "PK_7830e9956c834d179aae93b7a25" PRIMARY KEY ("id", "eventName"))`);
        await queryRunner.query(`CREATE TABLE "vault_controller_transactions" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "transactionHash" bytea NOT NULL, "l1BatchNumber" bigint NOT NULL, "totalShares" numeric NOT NULL, "messageHashCount" integer NOT NULL, "status" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_f76bfb868d1e64c8bc419ce718b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6c60dd09be6a90fd1ea85a5eac" ON "vault_controller_transactions" ("transactionHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_4ce30fa70dd7580c992cc985ef" ON "vault_controller_transactions" ("l1BatchNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_2da5272c9e202b87d1e0d4005a" ON "vault_controller_transactions" ("status") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_531dd5a8b0c99f36e009101aa11" FOREIGN KEY ("vault_controller_transaction_id") REFERENCES "vault_controller_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_531dd5a8b0c99f36e009101aa11"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2da5272c9e202b87d1e0d4005a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ce30fa70dd7580c992cc985ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6c60dd09be6a90fd1ea85a5eac"`);
        await queryRunner.query(`DROP TABLE "vault_controller_transactions"`);
        await queryRunner.query(`DROP TABLE "event_cursors"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee4051e8b995251a6ce2e57013"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_41d0949231626ebf9c26fc2aff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40e47b149aa922ee1c868770c0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a629587e749dda5721fed9a5c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fda61b413a16cbfc74abf0b149"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6264a760ae26b2449eeba11f8e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
    }

}
