import type { DatabaseClient } from '../src/database/client';
import { initializeDatabase } from '../src/database/initialize';
import { migrateDatabase, type Migration } from '../src/database/migrations';

// Only used with explicitly isolated test databases, never arthika.db.
export const fixtureMigrations: readonly Migration[] = [
  {
    version: 1,
    name: 'test-parent-and-child',
    up: async (db) => db.execAsync(`
      CREATE TABLE test_parent (id INTEGER PRIMARY KEY, label TEXT NOT NULL);
      CREATE TABLE test_child (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES test_parent(id)
      );
    `),
  },
  {
    version: 2,
    name: 'test-child-index',
    up: async (db) => db.execAsync('CREATE INDEX test_child_parent ON test_child(parent_id)'),
  },
];

function check(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

export async function runDatabaseChecks(client: DatabaseClient): Promise<string[]> {
  const passed: string[] = [];
  await initializeDatabase(client, { enableWAL: false, steps: fixtureMigrations });
  await migrateDatabase(client, fixtureMigrations);
  const version = await client.withSession((db) =>
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'));
  check(version?.user_version === 2, 'Migration version/repeated initialization failed.');
  passed.push('ordered and repeatable migrations');

  const label = "Bound text'); DROP TABLE test_parent; --";
  await client.withSession((db) => db.runAsync(
    'INSERT INTO test_parent (id, label) VALUES (?, ?)', 1, label,
  ));
  const row = await client.withSession((db) =>
    db.getFirstAsync<{ label: string }>('SELECT label FROM test_parent WHERE id = ?', 1));
  check(row?.label === label, 'Parameter binding failed.');
  passed.push('bound parameters');

  let rejected = false;
  try {
    await client.transaction((db) => db.runAsync(
      'INSERT INTO test_child (id, parent_id) VALUES (?, ?)', 1, 999,
    ));
  } catch {
    rejected = true;
  }
  check(rejected, 'Foreign keys were not enforced inside a transaction.');
  passed.push('foreign keys inside transactions');

  try {
    await client.transaction(async (db) => {
      await db.runAsync('INSERT INTO test_parent (id, label) VALUES (?, ?)', 2, 'rolled back');
      throw new Error('Intentional isolated test rollback.');
    });
  } catch { /* The following query verifies rollback, not just rejection. */ }
  const absent = await client.withSession((db) =>
    db.getFirstAsync('SELECT id FROM test_parent WHERE id = ?', 2));
  check(absent === null, 'Rollback left a partial write.');
  passed.push('atomic rollback and queue recovery');

  let release!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const transaction = client.transaction(async (db) => {
    await db.runAsync('INSERT INTO test_parent (id, label) VALUES (?, ?)', 3, 'rolled back');
    started();
    await gate;
    throw new Error('Intentional isolated transaction failure.');
  });
  // Observe the expected rejection immediately to avoid unhandled promises.
  const rejectedTransaction = transaction.catch(() => undefined);
  await startedPromise;
  const independent = client.withSession((db) => db.runAsync(
    'INSERT INTO test_parent (id, label) VALUES (?, ?)', 4, 'independent',
  ));
  release();
  await Promise.all([rejectedTransaction, independent]);
  const rows = await client.withSession((db) => db.getAllAsync<{ id: number }>(
    'SELECT id FROM test_parent WHERE id IN (3, 4) ORDER BY id',
  ));
  check(rows.length === 1 && rows[0].id === 4, 'Unrelated access joined a failed transaction.');
  passed.push('concurrent access isolation');

  const failingSteps: readonly Migration[] = [
    ...fixtureMigrations,
    {
      version: 3,
      name: 'test-failing-migration',
      up: async (db) => {
        await db.execAsync('CREATE TABLE test_partial_migration (id INTEGER PRIMARY KEY)');
        throw new Error('Intentional isolated migration failure.');
      },
    },
  ];
  try { await migrateDatabase(client, failingSteps); } catch { /* Check state below. */ }
  const after = await client.withSession(async (db) => ({
    version: await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'),
    table: await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", 'test_partial_migration',
    ),
  }));
  check(after.version?.user_version === 2 && after.table === null, 'Migration rollback failed.');
  passed.push('migration rollback');
  return passed;
}
