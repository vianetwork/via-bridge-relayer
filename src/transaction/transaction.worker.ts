import { Worker } from '../common/worker';
import { TransactionProcessor } from './transaction.processor';
import waitFor from '../utils/waitFor';

export class TransactionWorker extends Worker {
  public constructor(
    private readonly transactionProcessor: TransactionProcessor,
    private readonly pollingInterval: number
  ) {
    super();
  }

  public stop() {
    return super.stop();
  }

  protected async runProcess(): Promise<void> {
    const isNextBatchProcessed =
      await this.transactionProcessor.processNextBatch();
    if (!isNextBatchProcessed) {
      await waitFor(() => !this.currentProcessPromise, this.pollingInterval);
    }
    if (!this.currentProcessPromise) {
      return;
    }
    return this.runProcess();
  }
}
