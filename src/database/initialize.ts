import type { DatabaseClient } from './client';
import { migrateDatabase, type Migration, migrations } from './migrations';

export async function initializeDatabase(
  client: DatabaseClient,
  { enableWAL = true, steps = migrations }: {
    enableWAL?: boolean;
    steps?: readonly Migration[];
  } = {},
): Promise<void> {
  await client.withSession(async (session) => {
    // Connection settings must be set outside any transaction.
    await session.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const row = await session.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (row?.foreign_keys !== 1) {
      throw new Error('Foreign-key enforcement could not be enabled.');
    }
    if (enableWAL) {
      await session.execAsync('PRAGMA journal_mode = WAL');
    }
  });
  await migrateDatabase(client, steps);
}
