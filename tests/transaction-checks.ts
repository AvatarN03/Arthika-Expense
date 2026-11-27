import type { DatabaseClient } from '../src/database/client';
import { initializeDatabase } from '../src/database/initialize';
import { createMoneySourceRepository } from '../src/database/repositories/money-sources';
import {
  createTransactionRepository,
  type CreateAdjustment,
  type CreateExpense,
} from '../src/database/repositories/transactions';

function check(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

// Run only against a fresh isolated database. Shared by Node and Expo web checks.
export async function runTransactionChecks(client: DatabaseClient): Promise<string[]> {
  const checks: string[] = [];
  await initializeDatabase(client, { enableWAL: false });
  await initializeDatabase(client, { enableWAL: false });
  const sources = createMoneySourceRepository(client);
  const transactions = createTransactionRepository(client);
  const bank = await sources.create({
    name: 'Main bank', type: 'bank', openingBalanceMinor: 50000, currencyCode: 'INR',
  });
  const cash = await sources.create({
    name: 'Cash', type: 'cash', openingBalanceMinor: 2000, currencyCode: 'INR',
  });

  const cashExpense = await transactions.createExpense({
    sourceId: cash.id,
    amountMinor: 250,
    occurredAt: '2026-11-20T09:00:00+05:30',
    description: '  Tea and snacks  ',
    paymentMethod: '  cash  ',
  });
  const expense = await transactions.createExpense({
    sourceId: bank.id,
    amountMinor: 840,
    occurredAt: '2026-11-22T10:30:00+05:30',
    description: "  Groceries'); DROP TABLE transactions; --  ",
    paymentMethod: '  UPI  ',
  });
  const credit = await transactions.createAdjustment({
    sourceId: bank.id,
    amountMinor: 125,
    direction: 'credit',
    occurredAt: '2026-11-21T08:00:00Z',
    description: '  Opening count correction  ',
  });
  const debit = await transactions.createAdjustment({
    sourceId: bank.id,
    amountMinor: Number.MAX_SAFE_INTEGER,
    direction: 'debit',
    occurredAt: '2026-11-19T08:00:00Z',
    description: 'Maximum safe-integer check',
  });
  check(expense.type === 'expense' && expense.direction === 'debit', 'Expense direction/type failed.');
  check(expense.amountMinor === 840 && expense.description?.startsWith('Groceries') === true,
    'Expense mapping failed.');
  check(expense.paymentMethod === 'UPI' && expense.occurredAt === '2026-11-22T05:00:00.000Z',
    'Text trimming or timestamp canonicalization failed.');
  check(credit.direction === 'credit' && credit.paymentMethod === null, 'Credit adjustment mapping failed.');
  check(debit.amountMinor === Number.MAX_SAFE_INTEGER, 'Safe-integer precision failed.');
  check(/^[a-f0-9]{32}$/.test(expense.id) && expense.createdAt === expense.updatedAt, 'ID/timestamps failed.');
  check((await transactions.getById(expense.id))?.id === expense.id, 'Lookup by ID failed.');
  check(await transactions.getById('missing') === null, 'Missing transaction must return null.');
  const ledgerEntries = await transactions.listLedgerEntries();
  check(ledgerEntries.length === 4, 'Minimal ledger listing failed.');
  check(
    ledgerEntries.every((entry) =>
      Object.keys(entry).sort().join(',') === 'amountMinor,direction,sourceId'),
    'Minimal ledger listing exposed extra fields.',
  );
  check(
    ledgerEntries.some((entry) =>
      entry.sourceId === bank.id
      && entry.direction === 'debit'
      && entry.amountMinor === 840),
    'Minimal ledger listing lost a transaction effect.',
  );
  checks.push('idempotent migration, expense/adjustment creation and row mapping');
  checks.push('minimal ledger listing for balance calculation');

  const baseExpense: CreateExpense = {
    sourceId: bank.id, amountMinor: 100, occurredAt: '2026-11-22T10:00:00Z',
  };
  const invalidExpenses = [
    { amountMinor: 0 }, { amountMinor: -1 }, { amountMinor: 1.5 },
    { amountMinor: Number.MAX_SAFE_INTEGER + 1 }, { amountMinor: NaN },
    { sourceId: '' }, { sourceId: 'missing' }, { sourceId: null },
    { occurredAt: '' }, { occurredAt: '2026-11-22T10:00:00' }, { occurredAt: 'not-a-date' },
    { description: 'bad\0text' }, { description: 100 },
    { paymentMethod: 'bad\0method' }, { paymentMethod: 100 },
  ];
  for (const patch of invalidExpenses) {
    let rejected = false;
    try { await transactions.createExpense({ ...baseExpense, ...patch } as CreateExpense); }
    catch { rejected = true; }
    check(rejected, 'Invalid expense input was accepted.');
  }
  const baseAdjustment: CreateAdjustment = {
    sourceId: bank.id, amountMinor: 100, direction: 'credit',
    occurredAt: '2026-11-22T10:00:00Z', description: 'Count correction',
  };
  for (const patch of [{ direction: 'up' }, { description: '' }, { description: ' \n' }, { description: null }]) {
    let rejected = false;
    try { await transactions.createAdjustment({ ...baseAdjustment, ...patch } as CreateAdjustment); }
    catch { rejected = true; }
    check(rejected, 'Invalid adjustment input was accepted.');
  }
  check((await transactions.list()).length === 4, 'Validation left a partial transaction.');
  checks.push('input validation, positive magnitudes and exact safe-integer limit');

  // Deliberately bypass repository validation to verify database constraints.
  const timestamp = '2026-11-22T10:00:00.000Z';
  const invalidRows = [
    ['income', 'credit', 100, bank.id, null, timestamp],
    ['expense', 'credit', 100, bank.id, null, timestamp],
    ['expense', 'debit', 0, bank.id, null, timestamp],
    ['expense', 'debit', -1, bank.id, null, timestamp],
    ['expense', 'debit', 1.5, bank.id, null, timestamp],
    ['expense', 'debit', 9007199254740992, bank.id, null, timestamp],
    ['expense', 'debit', 100, 'missing', null, timestamp],
    ['expense', 'debit', 100, bank.id, '', timestamp],
    ['expense', 'debit', 100, bank.id, null, 'not-a-time'],
  ] as const;
  for (const [type, direction, amount, sourceId, description, occurredAt] of invalidRows) {
    let rejected = false;
    try {
      await client.transaction((db) => db.runAsync(
        `INSERT INTO transactions
          (type, direction, amount_minor, source_id, description, occurred_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        type, direction, amount, sourceId, description, occurredAt, timestamp, timestamp,
      ));
    } catch { rejected = true; }
    check(rejected, 'Database accepted an invalid transaction row.');
  }
  check((await transactions.list()).length === 4, 'Constraint failure left partial data.');
  checks.push('database constraints, foreign keys and failed-write recovery');

  const ordered = await transactions.list();
  check(ordered.map((item) => item.id).join(',') === [expense.id, credit.id, cashExpense.id, debit.id].join(','),
    'Activity ordering is incorrect.');
  const bankOnly = await transactions.list({ sourceId: bank.id, limit: 2 });
  check(bankOnly.length === 2 && bankOnly.every((item) => item.sourceId === bank.id), 'Source filter/limit failed.');
  const adjustments = await transactions.list({ type: 'adjustment' });
  check(adjustments.length === 2 && adjustments.every((item) => item.type === 'adjustment'), 'Type filter failed.');
  for (const options of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { type: 'income' }, { sourceId: '' }]) {
    let rejected = false;
    try { await transactions.list(options as never); } catch { rejected = true; }
    check(rejected, 'Invalid list options were accepted.');
  }
  checks.push('bounded deterministic listing with source and type filters');

  const archivedCash = await sources.archive(cash.id);
  check(archivedCash?.isArchived === true, 'Source archive failed.');
  let archivedWriteRejected = false;
  try { await transactions.createExpense({ ...baseExpense, sourceId: cash.id }); }
  catch { archivedWriteRejected = true; }
  check(archivedWriteRejected, 'Archived source accepted a new transaction.');
  check((await transactions.getById(cashExpense.id))?.sourceId === cash.id,
    'Archiving made historical activity unresolvable.');
  let deleteRejected = false;
  try { await client.withSession((db) => db.runAsync('DELETE FROM money_sources WHERE id = ?', cash.id)); }
  catch { deleteRejected = true; }
  check(deleteRejected && await sources.getById(cash.id) !== null, 'Foreign key allowed source history deletion.');
  checks.push('archive write blocking and historical source protection');

  const concurrent = await Promise.all([
    transactions.createExpense({ ...baseExpense, description: 'Concurrent A' }),
    transactions.createExpense({ ...baseExpense, description: 'Concurrent B' }),
  ]);
  check(concurrent[0].id !== concurrent[1].id, 'Concurrent writes reused a transaction ID.');
  check((await transactions.list()).length === 6, 'Concurrent writes lost data.');
  check((await transactions.listLedgerEntries()).length === 6, 'Concurrent ledger listing lost data.');
  checks.push('queued concurrent transaction creation');
  return checks;
}

export async function verifyTransactionPersistence(client: DatabaseClient): Promise<void> {
  await initializeDatabase(client, { enableWAL: false });
  const transactions = createTransactionRepository(client);
  const all = await transactions.list();
  const expense = all.find((item) => item.description?.startsWith('Groceries'));
  const cashExpense = all.find((item) => item.description === 'Tea and snacks');
  check(all.length === 6, 'Persisted transaction count changed.');
  check((await transactions.listLedgerEntries()).length === 6,
    'Persisted ledger entry count changed.');
  check(expense?.amountMinor === 840 && expense.occurredAt === '2026-11-22T05:00:00.000Z',
    'Persisted expense changed.');
  check(cashExpense !== undefined && (await transactions.getById(cashExpense.id))?.id === cashExpense.id,
    'Archived-source transaction did not survive reopening.');
}
