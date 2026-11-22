import { Platform } from 'react-native';

import { createDatabaseClient, type DatabaseClient } from './client';
import { initializeDatabase } from './initialize';

export const DATABASE_NAME = 'arthika.db';
let connection: Promise<DatabaseClient> | undefined;

async function openDatabase(): Promise<DatabaseClient> {
  if (Platform.OS === 'web' && !globalThis.crossOriginIsolated) {
    throw new Error('SQLite web requires cross-origin isolation headers.');
  }

  // Import only when a client mounts, not during web server-side rendering.
  const { openDatabaseAsync } = await import('expo-sqlite');
  const database = await openDatabaseAsync(DATABASE_NAME);
  const client = createDatabaseClient(database);
  try {
    // Use the web VFS defaults rather than assume native WAL behaviour.
    await initializeDatabase(client, { enableWAL: Platform.OS !== 'web' });
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}

export function getAppDatabase(): Promise<DatabaseClient> {
  // One connection/queue for the app lifetime, including Strict Mode remounts.
  connection ??= openDatabase().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
