import type { DatabaseClient } from '../src/database/client';
import { initializeDatabase } from '../src/database/initialize';
import { createMoneySourceRepository, type CreateMoneySource } from '../src/database/repositories/money-sources';

function check(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

// Run only against a fresh isolated database. Shared by Node and the Expo web worker.
export async function runMoneySourceChecks(client: DatabaseClient): Promise<string[]> {
  const checks: string[] = [];
  await initializeDatabase(client, { enableWAL: false });
  await initializeDatabase(client, { enableWAL: false });
  const repository = createMoneySourceRepository(client);
  check((await repository.list()).length === 0, 'Sources must not be seeded.');
  const input: CreateMoneySource = {
    name: "  My bank'); DROP TABLE money_sources; --  ",
    type: 'bank', openingBalanceMinor: 12345, currencyCode: 'INR',
  };
  const bank = await repository.create(input);
  const cash = await repository.create({ ...input, name: 'Cash', type: 'cash', openingBalanceMinor: 0 });
  const wallet = await repository.create({
    ...input, name: 'Wallet', type: 'wallet', openingBalanceMinor: -500, currencyCode: 'USD',
  });
  check(bank.name === input.name.trim() && bank.openingBalanceMinor === 12345, 'Bound source creation failed.');
  check(cash.type === 'cash' && wallet.type === 'wallet' && wallet.currencyCode === 'USD', 'Source types/currency failed.');
  check(wallet.openingBalanceMinor === -500 && !bank.isArchived, 'Signed opening balance/archive mapping failed.');
  check(/^[a-f0-9]{32}$/.test(bank.id) && bank.createdAt === bank.updatedAt, 'ID/timestamps failed.');
  check(new Set([bank.id, cash.id, wallet.id]).size === 3, 'Source IDs collided.');
  check((await repository.getById(bank.id))?.name === bank.name, 'Read by ID failed.');
  check(await repository.getById('missing') === null, 'Missing source must be null.');
  checks.push('migration idempotency, creation, bound names and row mapping');

  const invalid = [
    { name: '' }, { name: ' \t\n' }, { name: 'bad\0name' }, { name: null },
    { type: 'upi' }, { openingBalanceMinor: 1.25 }, { openingBalanceMinor: NaN },
    { openingBalanceMinor: Infinity }, { openingBalanceMinor: '100' },
    { openingBalanceMinor: Number.MAX_SAFE_INTEGER + 1 },
    { openingBalanceMinor: Number.MIN_SAFE_INTEGER - 1 },
    { currencyCode: '' }, { currencyCode: 'inr' }, { currencyCode: 'USDD' }, { currencyCode: null },
  ];
  for (const patch of invalid) {
    let rejected = false;
    try { await repository.create({ ...input, ...patch } as CreateMoneySource); }
    catch { rejected = true; }
    check(rejected, 'Invalid source input was accepted.');
  }
  check((await repository.list()).length === 3, 'Validation left a partial source.');
  const limits = await Promise.all([
    repository.create({ ...input, name: 'Maximum', openingBalanceMinor: Number.MAX_SAFE_INTEGER }),
    repository.create({ ...input, name: 'Minimum', openingBalanceMinor: Number.MIN_SAFE_INTEGER }),
  ]);
  check(limits[0].openingBalanceMinor === Number.MAX_SAFE_INTEGER, 'Maximum integer lost precision.');
  check(limits[1].openingBalanceMinor === Number.MIN_SAFE_INTEGER, 'Minimum integer lost precision.');
  checks.push('input validation and exact signed safe-integer limits');

  // Bypass application validation deliberately to exercise the database constraints.
  for (const [name, type, amount, currency, archived] of [
    ['', 'bank', 0, 'INR', 0], ['bad', 'card', 0, 'INR', 0],
    ['bad', 'bank', 0.5, 'INR', 0], ['bad', 'bank', 9007199254740992, 'INR', 0],
    ['bad', 'bank', -9007199254740992, 'INR', 0],
    ['bad', 'bank', 0, 'inr', 0], ['bad', 'bank', 0, 'INR', 2],
  ] as const) {
    let rejected = false;
    try {
      await client.transaction((db) => db.runAsync(
        `INSERT INTO money_sources
          (name, type, opening_balance_minor, currency_code, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, name, type, amount, currency, archived, 'test', 'test',
      ));
    } catch { rejected = true; }
    check(rejected, 'Database accepted invalid source data.');
  }
  check((await repository.list()).length === 5, 'Constraint failure left partial data.');
  checks.push('database constraints and failed-write recovery');

  const edited = await repository.updateDetails(bank.id, { name: '  Daily account  ', type: 'bank' });
  check(edited?.name === 'Daily account' && edited.openingBalanceMinor === bank.openingBalanceMinor,
    'Details update changed the opening balance.');
  check(edited.currencyCode === bank.currencyCode && edited.createdAt === bank.createdAt,
    'Details update changed financial/history metadata.');
  check(await repository.updateDetails('missing', { name: 'Missing', type: 'bank' }) === null,
    'Missing update must return null.');
  let rejectedUpdate = false;
  try { await repository.updateDetails(bank.id, { name: ' ', type: 'bank' }); }
  catch { rejectedUpdate = true; }
  check(rejectedUpdate && (await repository.getById(bank.id))?.name === 'Daily account', 'Invalid edit changed data.');
  checks.push('non-financial editing without balance/history rewrites');

  // This is a test-only reference table, NOT the future product transaction schema.
  await client.withSession((db) => db.execAsync(`
    CREATE TABLE test_source_reference (
      source_id TEXT NOT NULL REFERENCES money_sources(id), note TEXT NOT NULL
    );
  `));
  await client.withSession((db) => db.runAsync(
    'INSERT INTO test_source_reference (source_id, note) VALUES (?, ?)', bank.id, 'history preserved',
  ));
  const archived = await repository.archive(bank.id);
  check(archived?.isArchived === true, 'Archive failed.');
  check((await repository.archive(bank.id))?.updatedAt === archived.updatedAt, 'Repeated archive changed state.');
  check((await repository.getById(bank.id))?.openingBalanceMinor === 12345, 'Archived source is no longer resolvable.');
  check(!(await repository.list()).some((source) => source.id === bank.id), 'Active list contains archived source.');
  check((await repository.list({ includeArchived: true })).length === 5, 'Archive deleted a source.');
  const history = await client.withSession((db) => db.getFirstAsync<{ note: string }>(
    'SELECT note FROM test_source_reference WHERE source_id = ?', bank.id,
  ));
  check(history?.note === 'history preserved', 'Archive damaged a historical reference.');
  check(await repository.archive('missing') === null, 'Missing archive must return null.');
  checks.push('idempotent archiving, active filtering and historical references');

  // No uniqueness rule for display names; concurrent submissions must get distinct IDs.
  const duplicate = { ...input, name: 'Duplicate name' };
  const created = await Promise.all([repository.create(duplicate), repository.create(duplicate)]);
  check(created[0].id !== created[1].id, 'Concurrent creation reused an ID.');
  const all = await repository.list({ includeArchived: true });
  check(all.length === 7 && new Set(all.map((source) => source.id)).size === 7, 'Concurrent writes lost data.');
  check(JSON.stringify(all) === JSON.stringify(await repository.list({ includeArchived: true })), 'List ordering is unstable.');
  checks.push('concurrent creation and deterministic listing');
  return checks;
}

export async function verifyMoneySourcePersistence(client: DatabaseClient): Promise<void> {
  await initializeDatabase(client, { enableWAL: false });
  const repository = createMoneySourceRepository(client);
  const sources = await repository.list({ includeArchived: true });
  const bank = sources.find((source) => source.name === 'Daily account');
  check(sources.length === 7 && (await repository.list()).length === 6, 'Persisted source count/filter failed.');
  check(bank?.isArchived === true && bank.openingBalanceMinor === 12345 && bank.currencyCode === 'INR',
    'Persisted source data changed.');
  check((await repository.getById(bank.id))?.id === bank.id, 'Stable ID did not survive reopening.');
  const reference = await client.withSession((db) => db.getFirstAsync<{ source_id: string }>(
    'SELECT source_id FROM test_source_reference',
  ));
  check(reference?.source_id === bank.id, 'Persisted source reference changed.');
}
