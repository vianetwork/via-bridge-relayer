import { MigrationInterface, QueryRunner } from "typeorm";

export class AddL1BatchFinalizedStatus1735228800000 implements MigrationInterface {
    name = 'AddL1BatchFinalizedStatus1735228800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update existing VaultUpdated (status = 5) to new value (status = 6)
        // This makes room for the new L1BatchFinalized status (= 5)
        await queryRunner.query(`UPDATE "transactions" SET "status" = 6 WHERE "status" = 5`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert: Move any L1BatchFinalized (5) back to Finalized (2)
        // Then move VaultUpdated (6) back to (5)
        await queryRunner.query(`UPDATE "transactions" SET "status" = 2 WHERE "status" = 5`);
        await queryRunner.query(`UPDATE "transactions" SET "status" = 5 WHERE "status" = 6`);
    }

}
