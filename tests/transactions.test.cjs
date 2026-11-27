require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { connect } = require('./sqlite-helper.cjs');
const { initializeDatabase } = require('../src/database/initialize.ts');
const { migrateDatabase, migrations } = require('../src/database/migrations/index.ts');
const { createMoneySourceRepository } = require('../src/database/repositories/money-sources.ts');
const { createTransactionRepository } = require('../src/database/repositories/transactions.ts');
const { calculateTrackedBalances } = require('../src/domain/balance.ts');
const { validateExpense } = require('../src/domain/expense.ts');
const { parseMajorToMinor } = require('../src/lib/money.ts');
const { runTransactionChecks, verifyTransactionPersistence } = require('./transaction-checks.ts');

test('transaction repository rules run against real SQLite', async () => {
  const client = connect();
  try { assert.equal((await runTransactionChecks(client)).length, 7); }
  finally { await client.close(); }
});

test('repository ledger entries feed tracked balances', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 50000, currencyCode: 'INR',
    });
    const cash = await sources.create({
      name: 'Cash', type: 'cash', openingBalanceMinor: 2000, currencyCode: 'INR',
    });

    await transactions.createExpense({
      sourceId: bank.id,
      amountMinor: 840,
      occurredAt: '2026-11-22T10:00:00Z',
    });
    await transactions.createAdjustment({
      sourceId: bank.id,
      amountMinor: 125,
      direction: 'credit',
      occurredAt: '2026-11-21T08:00:00Z',
      description: 'Count correction',
    });

    const result = calculateTrackedBalances(
      await sources.list({ includeArchived: true }),
      await transactions.listLedgerEntries(),
    );

    const bySource = new Map(result.sources.map((item) => [item.sourceId, item]));
    assert.deepEqual(bySource.get(bank.id), {
      sourceId: bank.id, currencyCode: 'INR', balanceMinor: 49285,
    });
    assert.deepEqual(bySource.get(cash.id), {
      sourceId: cash.id, currencyCode: 'INR', balanceMinor: 2000,
    });
    assert.deepEqual(result.totals, [{ currencyCode: 'INR', totalMinor: 51285 }]);
  } finally { await client.close(); }
});

test('add-expense form path converts and persists an expense', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 50000, currencyCode: 'INR',
    });

    // Mirror the form: text amount -> minor units, validate, then create.
    const amountMinor = parseMajorToMinor('1,250.75');
    const expense = validateExpense({
      amountMinor,
      sourceId: bank.id,
      occurredAt: new Date('2026-11-22T10:00:00Z').toISOString(),
      description: 'Groceries',
    });
    const saved = await transactions.createExpense(expense);

    assert.equal(saved.type, 'expense');
    assert.equal(saved.direction, 'debit');
    assert.equal(saved.amountMinor, 125075);
    assert.equal(saved.sourceId, bank.id);
    assert.equal(saved.description, 'Groceries');
    assert.equal((await transactions.listLedgerEntries()).length, 1);
  } finally { await client.close(); }
});

test('version one upgrades to transactions without changing existing sources', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false, steps: [migrations[0]] });
    const sources = createMoneySourceRepository(client);
    const source = await sources.create({
      name: 'Existing cash', type: 'cash', openingBalanceMinor: 500, currencyCode: 'INR',
    });
    await initializeDatabase(client, { enableWAL: false });
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 2);
    assert.deepEqual((await sources.getById(source.id)), source);
    assert.deepEqual(await createTransactionRepository(client).list(), []);
  } finally { await client.close(); }
});

test('failed version-two upgrade keeps version one sources and removes partial transaction schema', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false, steps: [migrations[0]] });
    const sources = createMoneySourceRepository(client);
    const source = await sources.create({
      name: 'Preserved bank', type: 'bank', openingBalanceMinor: 100, currencyCode: 'INR',
    });
    await assert.rejects(migrateDatabase(client, [...migrations, {
      version: 3, name: 'intentional-test-failure', up: async () => { throw new Error('test rollback'); },
    }]), /test rollback/);
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 1);
    assert.equal(await client.withSession((db) => db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transactions'",
    )), null);
    assert.deepEqual(await sources.getById(source.id), source);
  } finally { await client.close(); }
});

test('transactions and historical source references survive a file reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arthika-transactions-test-'));
  const filename = join(directory, 'isolated.db');
  let client = connect(filename);
  try {
    await runTransactionChecks(client);
    await client.close();
    client = connect(filename);
    await verifyTransactionPersistence(client);
  } finally {
    await client.close();
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});
