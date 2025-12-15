import * as dbIndex from '../../src/database';

describe('database index exports', () => {
  test('exports repositories', () => {
    expect(dbIndex).toHaveProperty('TransactionRepository');
    expect(dbIndex).toHaveProperty('DepositExecutedRepository');
    expect(dbIndex).toHaveProperty('MessageWithdrawalExecutedRepository');
    expect(dbIndex).toHaveProperty('L1MessageSentRepository');
    expect(dbIndex).toHaveProperty('L2MessageSentRepository');
  });
});
