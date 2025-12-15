import { TransactionProcessorArgs, TransactionProcessorStatus } from '../transaction.processor';
import { BridgeInitiatedHandler } from './initiate/bridgeInitiatedHandler';
import { BridgeFinalizeHandler } from './finalize/bridgeFinalizeHandler';
import { L1BatchNumberHandler } from './finalize/l1BatchNumberHandler';
import { VaultControllerUpdateHandler } from './finalize/vaultControllerUpdateHandler';
import { WithdrawalStateUpdatedHandler } from './finalize/withdrawalStateUpdatedHandler';


export class HandlerFactory {
  static createHandler(args: TransactionProcessorArgs): BridgeInitiatedHandler | BridgeFinalizeHandler | L1BatchNumberHandler | VaultControllerUpdateHandler | WithdrawalStateUpdatedHandler {
    switch (args.status) {
      case TransactionProcessorStatus.New:
        return new BridgeInitiatedHandler(
          args.transactionRepository,
          args.depositExecutedRepository,
          args.messageWithdrawalExecutedRepository,
          args.l1MessageSentRepository,
          args.l2MessageSentRepository,
          args.vaultControllerTransactionRepository,
          args.contractAddresses,
          args.origin,
          args.originProvider,
          args.destinationProvider
        );
      case TransactionProcessorStatus.Pending:
        return new BridgeFinalizeHandler(
          args.transactionRepository,
          args.depositExecutedRepository,
          args.messageWithdrawalExecutedRepository,
          args.l1MessageSentRepository,
          args.l2MessageSentRepository,
          args.vaultControllerTransactionRepository,
          args.contractAddresses,
          args.origin,
          args.originProvider,
          args.destinationProvider
        );
      case TransactionProcessorStatus.FetchL1BatchNumber:
        return new L1BatchNumberHandler(
          args.transactionRepository,
          args.depositExecutedRepository,
          args.messageWithdrawalExecutedRepository,
          args.l1MessageSentRepository,
          args.l2MessageSentRepository,
          args.vaultControllerTransactionRepository,
          args.contractAddresses,
          args.origin,
          args.originProvider,
          args.destinationProvider
        );
      case TransactionProcessorStatus.UpdateVaultController:
        return new VaultControllerUpdateHandler(
          args.transactionRepository,
          args.depositExecutedRepository,
          args.messageWithdrawalExecutedRepository,
          args.l1MessageSentRepository,
          args.l2MessageSentRepository,
          args.vaultControllerTransactionRepository,
          args.contractAddresses,
          args.origin,
          args.originProvider,
          args.destinationProvider
        );
      case TransactionProcessorStatus.CheckWithdrawalStateUpdated:
        return new WithdrawalStateUpdatedHandler(
          args.transactionRepository,
          args.depositExecutedRepository,
          args.messageWithdrawalExecutedRepository,
          args.l1MessageSentRepository,
          args.l2MessageSentRepository,
          args.vaultControllerTransactionRepository,
          args.contractAddresses,
          args.origin,
          args.originProvider,
          args.destinationProvider
        );

      default:
        throw new Error(`Unknown status: ${args.status}`);
    }
  }
}