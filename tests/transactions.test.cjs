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

test('saved expenses appear in the bounded recent-activity list', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });

    await transactions.createExpense({
      sourceId: bank.id, amountMinor: 250, occurredAt: '2026-11-20T09:00:00Z',
    });
    await transactions.createExpense({
      sourceId: bank.id, amountMinor: 840, occurredAt: '2026-11-22T10:00:00Z',
      description: 'Groceries',
    });

    const recent = await transactions.list({ limit: 2 });
    assert.equal(recent.length, 2);
    assert.equal(recent[0].description, 'Groceries');
    assert.equal(recent[0].amountMinor, 840);
    assert.equal(recent[1].amountMinor, 250);

    const balances = calculateTrackedBalances(
      await sources.list(), await transactions.listLedgerEntries(),
    );
    assert.deepEqual(balances.sources, [
      { sourceId: bank.id, currencyCode: 'INR', balanceMinor: 8910 },
    ]);
  } finally { await client.close(); }
});

test('voiding an expense preserves history and reverses the balance', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 5000, currencyCode: 'INR',
    });
    const expense = await transactions.createExpense({
      sourceId: bank.id, amountMinor: 840, occurredAt: '2026-11-22T10:00:00Z',
      description: 'Groceries',
    });

    const { voided, reversal } = await transactions.voidTransaction(expense.id, 'wrong amount');
    assert.equal(voided.isVoided, true);
    assert.equal(voided.id, expense.id);
    assert.equal(reversal.type, 'adjustment');
    assert.equal(reversal.direction, 'credit');
    assert.equal(reversal.amountMinor, 840);
    assert.equal(reversal.sourceId, bank.id);

    const ledger = await transactions.listLedgerEntries();
    // Both the (voided) original debit and the reversing credit remain, netting
    // to zero so the tracked balance is restored to the opening balance.
    assert.equal(ledger.length, 2);
    const directions = ledger.map((entry) => entry.direction).sort();
    assert.deepEqual(directions, ['credit', 'debit']);

    const balances = calculateTrackedBalances(
      await sources.list(), ledger,
    );
    // Opening balance restored to 5000.
    assert.deepEqual(balances.sources, [
      { sourceId: bank.id, currencyCode: 'INR', balanceMinor: 5000 },
    ]);

    // History is preserved: both rows are still listable.
    const all = await transactions.list();
    assert.equal(all.length, 2);
    const voidedRow = all.find((item) => item.id === expense.id);
    assert.equal(voidedRow?.isVoided, true);
  } finally { await client.close(); }
});

test('voiding rejects unknown and already-voided transactions', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 5000, currencyCode: 'INR',
    });
    const expense = await transactions.createExpense({
      sourceId: bank.id, amountMinor: 100, occurredAt: '2026-11-22T10:00:00Z',
    });

    await assert.rejects(transactions.voidTransaction('missing'), /unavailable/);
    await transactions.voidTransaction(expense.id);
    await assert.rejects(transactions.voidTransaction(expense.id), /already voided/);
  } finally { await client.close(); }
});

test('transfer persists both sides atomically and nets to zero', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });
    const cash = await sources.create({
      name: 'Cash', type: 'cash', openingBalanceMinor: 2000, currencyCode: 'INR',
    });

    const [debit, credit] = await transactions.createTransfer({
      sourceId: bank.id, toSourceId: cash.id, amountMinor: 3000,
      occurredAt: '2026-11-22T10:00:00Z',
    });

    assert.equal(debit.type, 'transfer');
    assert.equal(debit.direction, 'debit');
    assert.equal(debit.amountMinor, 3000);
    assert.equal(credit.type, 'transfer');
    assert.equal(credit.direction, 'credit');
    assert.equal(credit.amountMinor, 3000);
    assert.equal(debit.transferId, credit.transferId);
    assert.ok(/^[a-f0-9]{32}$/.test(debit.transferId));

    const ledger = await transactions.listLedgerEntries();
    assert.equal(ledger.length, 2);
    const balances = calculateTrackedBalances(
      await sources.list(), ledger,
    );
    // Transfer does not change total tracked money.
    assert.deepEqual(balances.totals, [{ currencyCode: 'INR', totalMinor: 12000 }]);
    assert.deepEqual(balances.sources, [
      { sourceId: bank.id, currencyCode: 'INR', balanceMinor: 7000 },
      { sourceId: cash.id, currencyCode: 'INR', balanceMinor: 5000 },
    ]);
  } finally { await client.close(); }
});

test('transfer rejects same source and archived sources', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });
    const cash = await sources.create({
      name: 'Cash', type: 'cash', openingBalanceMinor: 2000, currencyCode: 'INR',
    });

    await assert.rejects(transactions.createTransfer({
      sourceId: bank.id, toSourceId: bank.id, amountMinor: 100,
      occurredAt: '2026-11-22T10:00:00Z',
    }), /different/);

    await sources.archive(cash.id);
    await assert.rejects(transactions.createTransfer({
      sourceId: bank.id, toSourceId: cash.id, amountMinor: 100,
      occurredAt: '2026-11-22T10:00:00Z',
    }), /available/);
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
    assert.equal((await client.withSession((db) => db.getFirstAsync('PRAGMA user_version'))).user_version, 4);
    assert.deepEqual((await sources.getById(source.id)), source);
    assert.deepEqual(await createTransactionRepository(client).list(), []);
  } finally { await client.close(); }
});

test('failed post-version-one upgrade keeps version one sources and removes partial transaction schema', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false, steps: [migrations[0]] });
    const sources = createMoneySourceRepository(client);
    const source = await sources.create({
      name: 'Preserved bank', type: 'bank', openingBalanceMinor: 100, currencyCode: 'INR',
    });
    await assert.rejects(migrateDatabase(client, [...migrations, {
      version: migrations.length + 1, name: 'intentional-test-failure', up: async () => { throw new Error('test rollback'); },
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
