import type { DatabaseClient, DatabaseSession } from '../client';
import { createMoneySources } from './001-money-sources';
import { createTransactions } from './002-transactions';
import { addVoidedToTransactions } from './003-voided-transactions';

export type Migration = {
  version: number;
  name: string;
  up: (session: DatabaseSession) => Promise<void>;
};

export const migrations: readonly Migration[] = [
  { version: 1, name: 'money-sources', up: createMoneySources },
  { version: 2, name: 'transactions', up: createTransactions },
  { version: 3, name: 'voided-transactions', up: addVoidedToTransactions },
];

export async function migrateDatabase(
  client: DatabaseClient,
  steps: readonly Migration[] = migrations,
): Promise<void> {
  for (const [index, step] of steps.entries()) {
    if (step.version !== index + 1 || !step.name.trim()) {
      throw new Error('Database migrations must be named and consecutively versioned from one.');
    }
  }

  await client.transaction(async (session) => {
    const row = await session.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const current = row?.user_version;
    if (current === undefined || !Number.isSafeInteger(current) || current < 0) {
      throw new Error('Unable to read the database schema version.');
    }
    if (current > steps.length) {
      // Never downgrade, reset, or erase a database from a newer application.
      throw new Error('The database schema is newer than this application.');
    }

    for (const step of steps.slice(current)) {
      await step.up(session);
      // Version is a validated, source-controlled integer, not user input.
      await session.execAsync(`PRAGMA user_version = ${step.version}`);
    }
  });
}
