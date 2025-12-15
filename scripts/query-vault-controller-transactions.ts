import 'reflect-metadata';
import { relayerDataSource } from '../src/database/typeorm.config';
import { VaultControllerTransaction, VaultControllerTransactionStatus } from '../src/entities/vaultControllerTransaction.entity';

const statusNames: Record<VaultControllerTransactionStatus, string> = {
  [VaultControllerTransactionStatus.Pending]: 'Pending',
  [VaultControllerTransactionStatus.Confirmed]: 'Confirmed',
  [VaultControllerTransactionStatus.Failed]: 'Failed',
  [VaultControllerTransactionStatus.ReadyToClaim]: 'ReadyToClaim',
};

async function main() {
  try {
    console.log('Connecting to database...');
    await relayerDataSource.initialize();
    console.log('Connected!\n');

    const repo = relayerDataSource.getRepository(VaultControllerTransaction);
    const transactions = await repo.find({
      order: { createdAt: 'DESC' },
    });

    console.log(`Found ${transactions.length} vault controller transactions:\n`);
    console.log('='.repeat(120));

    for (const tx of transactions) {
      console.log(`ID: ${tx.id}`);
      console.log(`  Transaction Hash: ${tx.transactionHash}`);
      console.log(`  L1 Batch Number: ${tx.l1BatchNumber}`);
      console.log(`  Total Shares: ${tx.totalShares}`);
      console.log(`  Message Hash Count: ${tx.messageHashCount}`);
      console.log(`  Status: ${statusNames[tx.status]} (${tx.status})`);
      console.log(`  Created At: ${tx.createdAt}`);
      console.log(`  Updated At: ${tx.updatedAt}`);
      console.log('-'.repeat(120));
    }

    // Summary by status
    console.log('\nSummary by Status:');
    const statusCounts = transactions.reduce((acc, tx) => {
      acc[tx.status] = (acc[tx.status] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${statusNames[Number(status) as VaultControllerTransactionStatus]}: ${count}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (relayerDataSource.isInitialized) {
      await relayerDataSource.destroy();
    }
  }
}

main();
