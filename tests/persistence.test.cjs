require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { connect } = require('./sqlite-helper.cjs');
const { initializeDatabase } = require('../src/database/initialize.ts');
const { createMoneySourceRepository } = require('../src/database/repositories/money-sources.ts');
const { createTransactionRepository } = require('../src/database/repositories/transactions.ts');
const { calculateTrackedBalances } = require('../src/domain/balance.ts');

// A "restart" closes every connection and opens the same database file again.
// This confirms the whole app data model (sources plus their ledger entries)
// and the balances derived from them survive a full close/reopen cycle, as the
// app's queued connection does across app launches.
test('sources, transactions, and derived balances survive a full close/reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arthika-persistence-test-'));
  const filename = join(directory, 'arthika.db');

  let client = connect(filename);
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);

    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 50000, currencyCode: 'INR',
    });
    await sources.create({
      name: 'Cash', type: 'cash', openingBalanceMinor: 2000, currencyCode: 'INR',
    });
    await transactions.createExpense({
      sourceId: bank.id, amountMinor: 840, occurredAt: '2026-11-22T10:00:00Z',
    });
  } finally {
    await client.close();
  }

  // Simulate an app restart: reopen the same file with a fresh connection.
  client = connect(filename);
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);

    const list = await sources.list({ includeArchived: true });
    assert.equal(list.length, 2, 'Sources did not survive the reopen.');
    const bank = list.find((item) => item.name === 'Main bank');
    assert.ok(bank, 'Expected the pre-restart bank source.');
    assert.equal(bank.currencyCode, 'INR');
    assert.equal(bank.openingBalanceMinor, 50000);

    const ledger = await transactions.listLedgerEntries();
    assert.equal(ledger.length, 1, 'Transactions did not survive the reopen.');
    assert.equal(ledger[0].sourceId, bank.id);
    assert.equal(ledger[0].direction, 'debit');
    assert.equal(ledger[0].amountMinor, 840);

    const result = calculateTrackedBalances(list, ledger);
    const byId = new Map(result.sources.map((item) => [item.sourceId, item]));
    assert.equal(byId.get(bank.id).balanceMinor, 49160);
    assert.deepEqual(result.totals, [{ currencyCode: 'INR', totalMinor: 51160 }]);
  } finally {
    await client.close();
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});