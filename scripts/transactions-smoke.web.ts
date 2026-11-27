// Isolated development entry. Never import into the app or use arthika.db here.
import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import { createDatabaseClient } from '../src/database/client';
import { runTransactionChecks, verifyTransactionPersistence } from '../tests/transaction-checks';

const key = 'arthika-transactions-test-reload';
const result = globalThis as typeof globalThis & {
  __ARTHIKA_TRANSACTION_CHECK__?: { status: string; checks?: string[]; error?: string };
};

async function verify() {
  result.__ARTHIKA_TRANSACTION_CHECK__ = { status: 'running' };
  const savedName = sessionStorage.getItem(key);
  const name = savedName ?? `arthika-transactions-check-${Date.now()}.db`;
  if (!/^arthika-transactions-check-\d+\.db$/.test(name)) {
    throw new Error('Unexpected test database name.');
  }
  const raw = await openDatabaseAsync(name, { useNewConnection: true });
  const client = createDatabaseClient(raw);
  let checks: string[];
  try {
    if (savedName) {
      await verifyTransactionPersistence(client);
      checks = ['transaction persistence across browser reload'];
    } else {
      checks = await runTransactionChecks(client);
    }
  } finally {
    await client.close();
  }
  if (savedName) {
    await deleteDatabaseAsync(name);
    sessionStorage.removeItem(key);
    result.__ARTHIKA_TRANSACTION_CHECK__ = { status: 'passed', checks };
  } else {
    sessionStorage.setItem(key, name);
    result.__ARTHIKA_TRANSACTION_CHECK__ = { status: 'awaiting-reload', checks };
  }
}

verify().catch((error: unknown) => {
  result.__ARTHIKA_TRANSACTION_CHECK__ = {
    status: 'failed',
    error: error instanceof Error ? error.message : 'Transaction check failed.',
  };
});
