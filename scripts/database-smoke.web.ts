// Dedicated development test entry, not a route or an import in the app.
import { openDatabaseAsync, deleteDatabaseAsync } from 'expo-sqlite';

import { createDatabaseClient } from '../src/database/client';
import { initializeDatabase } from '../src/database/initialize';
import { fixtureMigrations, runDatabaseChecks } from '../tests/database-fixtures';

const key = 'arthika-foundation-test-reload';
const result = globalThis as typeof globalThis & {
  __ARTHIKA_DATABASE_CHECK__?: { status: string; checks?: string[]; error?: string };
};

async function verify() {
  result.__ARTHIKA_DATABASE_CHECK__ = { status: 'running' };
  const savedName = sessionStorage.getItem(key);
  const name = savedName ?? `arthika-foundation-check-${Date.now()}.db`;
  if (!/^arthika-foundation-check-\d+\.db$/.test(name)) {
    throw new Error('Unexpected test database name.');
  }
  const raw = await openDatabaseAsync(name, { useNewConnection: true });
  const client = createDatabaseClient(raw);
  let checks: string[];
  try {
    if (savedName) {
      await initializeDatabase(client, { enableWAL: false, steps: fixtureMigrations });
      const row = await client.withSession((db) => db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM test_parent',
      ));
      if (row?.count !== 2) throw new Error('Browser reload persistence failed.');
      checks = ['browser reload persistence'];
    } else {
      checks = await runDatabaseChecks(client);
    }
  } finally {
    await client.close();
  }

  if (savedName) {
    await deleteDatabaseAsync(name);
    sessionStorage.removeItem(key);
    result.__ARTHIKA_DATABASE_CHECK__ = { status: 'passed', checks };
  } else {
    sessionStorage.setItem(key, name);
    result.__ARTHIKA_DATABASE_CHECK__ = { status: 'awaiting-reload', checks };
  }
}

verify().catch((error: unknown) => {
  result.__ARTHIKA_DATABASE_CHECK__ = {
    status: 'failed', error: error instanceof Error ? error.message : 'Database check failed.',
  };
});
