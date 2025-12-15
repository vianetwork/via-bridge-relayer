import { Transaction } from './transactions.entity';
import { MessageWithdrawalExecuted } from './messageWithdrawalExecuted.entity';
import { DepositExecuted } from './depositExecuted.entity';
import { EventCursor } from './eventCursor.entity';
import { L1MessageSent } from './l1MessageSent.entity';
import { L2MessageSent } from './l2MessageSent.entity';
import { VaultControllerTransaction } from './vaultControllerTransaction.entity';

export { BaseEntity } from './base.entity';
export { Transaction, TransactionStatus } from './transactions.entity';
export { MessageWithdrawalExecuted } from './messageWithdrawalExecuted.entity';
export { DepositExecuted } from './depositExecuted.entity';
export { EventCursor } from './eventCursor.entity';
export { L1MessageSent } from './l1MessageSent.entity';
export { L2MessageSent } from './l2MessageSent.entity';
export { VaultControllerTransaction, VaultControllerTransactionStatus } from './vaultControllerTransaction.entity';

// Relayer DB entities (read/write, managed by relayer)
export const RELAYER_ENTITIES = [
  Transaction,
  VaultControllerTransaction,
  EventCursor,
];

// Graph DB entities (read-only, external subgraph data)
export const GRAPH_ENTITIES = [
  DepositExecuted,
  L1MessageSent,
  L2MessageSent,
  MessageWithdrawalExecuted,
];

export const ENTITIES = [
  ...RELAYER_ENTITIES,
  ...GRAPH_ENTITIES,
];
