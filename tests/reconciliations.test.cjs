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
const { createReconciliationRepository } = require('../src/database/repositories/reconciliations.ts');
const { calculateTrackedBalances } = require('../src/domain/balance.ts');

test('reconciliation persists record and linked adjustment atomically', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const reconciliations = createReconciliationRepository(client);

    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });

    const { reconciliation, adjustment } = await reconciliations.create({
      sourceId: bank.id,
      previousBalanceMinor: 10000,
      enteredBalanceMinor: 10500,
      currencyCode: 'INR',
      occurredAt: '2026-11-22T10:00:00Z',
      reason: 'Bank app shows higher',
    });

    assert.equal(reconciliation.previousBalanceMinor, 10000);
    assert.equal(reconciliation.enteredBalanceMinor, 10500);
    assert.equal(reconciliation.differenceMinor, 500);
    assert.equal(reconciliation.reason, 'Bank app shows higher');
    assert.ok(reconciliation.adjustmentTransactionId);
    assert.equal(adjustment.type, 'adjustment');
    assert.equal(adjustment.direction, 'credit');
    assert.equal(adjustment.amountMinor, 500);
    assert.equal(adjustment.sourceId, bank.id);

    const ledger = await transactions.listLedgerEntries();
    const balances = calculateTrackedBalances(await sources.list(), ledger);
    const bySource = new Map(balances.sources.map((item) => [item.sourceId, item]));
    assert.equal(bySource.get(bank.id).balanceMinor, 10500);

    const all = await reconciliations.list(bank.id);
    assert.equal(all.length, 1);
    const found = await reconciliations.getById(reconciliation.id);
    assert.deepEqual(found, reconciliation);
  } finally { await client.close(); }
});

test('zero difference creates no adjustment but still records', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const transactions = createTransactionRepository(client);
    const reconciliations = createReconciliationRepository(client);

    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });

    const { reconciliation, adjustment } = await reconciliations.create({
      sourceId: bank.id,
      previousBalanceMinor: 10000,
      enteredBalanceMinor: 10000,
      currencyCode: 'INR',
      occurredAt: '2026-11-22T10:00:00Z',
    });

    assert.equal(reconciliation.differenceMinor, 0);
    assert.equal(reconciliation.adjustmentTransactionId, null);
    assert.equal(adjustment, null);
    assert.equal((await transactions.list()).length, 0);
  } finally { await client.close(); }
});

test('reconciliation rejects archived or unknown source', async () => {
  const client = connect();
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const reconciliations = createReconciliationRepository(client);

    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });
    await sources.archive(bank.id);

    await assert.rejects(reconciliations.create({
      sourceId: bank.id,
      previousBalanceMinor: 10000,
      enteredBalanceMinor: 10500,
      currencyCode: 'INR',
      occurredAt: '2026-11-22T10:00:00Z',
    }), /unavailable/);

    await assert.rejects(reconciliations.create({
      sourceId: 'missing',
      previousBalanceMinor: 10000,
      enteredBalanceMinor: 10500,
      currencyCode: 'INR',
      occurredAt: '2026-11-22T10:00:00Z',
    }), /unavailable/);
  } finally { await client.close(); }
});

test('reconciliation persists across a close/reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arthika-recon-test-'));
  const filename = join(directory, 'isolated.db');
  let client = connect(filename);
  try {
    await initializeDatabase(client, { enableWAL: false });
    const sources = createMoneySourceRepository(client);
    const reconciliations = createReconciliationRepository(client);
    const bank = await sources.create({
      name: 'Main bank', type: 'bank', openingBalanceMinor: 10000, currencyCode: 'INR',
    });
    await reconciliations.create({
      sourceId: bank.id,
      previousBalanceMinor: 10000,
      enteredBalanceMinor: 9500,
      currencyCode: 'INR',
      occurredAt: '2026-11-22T10:00:00Z',
    });
    await client.close();

    client = connect(filename);
    await initializeDatabase(client, { enableWAL: false });
    const list = await createReconciliationRepository(client).list(bank.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].differenceMinor, -500);
    assert.ok(list[0].adjustmentTransactionId);
  } finally {
    await client.close();
    for (const suffix of ['', '-wal', '-shm']) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});