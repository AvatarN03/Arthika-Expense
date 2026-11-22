import type { SQLiteDatabase } from 'expo-sqlite';

export type DatabaseSession = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

type DatabaseDriver = DatabaseSession & Pick<SQLiteDatabase, 'withTransactionAsync' | 'closeAsync'>;
type DatabaseTask<T> = (session: DatabaseSession) => Promise<T>;

export interface DatabaseClient {
  withSession<T>(task: DatabaseTask<T>): Promise<T>;
  transaction<T>(task: DatabaseTask<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * All access (including reads) shares this queue. Ordinary Expo transactions
 * preserve this connection's foreign keys without absorbing unrelated tasks.
 * Inside callbacks, use the supplied session, never re-enter the client.
 * Do not retain the session or use it after the callback finishes.
 */
export function createDatabaseClient(database: DatabaseDriver): DatabaseClient {
  let tail: Promise<unknown> = Promise.resolve();
  let closing: Promise<void> | undefined;

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task);
    // A failed task rolls back but must not poison the rest of the queue.
    tail = result.catch(() => undefined);
    return result;
  }

  function checkOpen<T>(task: () => Promise<T>): Promise<T> {
    return closing ? Promise.reject(new Error('Database connection is closing.')) : enqueue(task);
  }

  function transaction<T>(task: DatabaseTask<T>): Promise<T> {
    return checkOpen(async () => {
      let result!: T;
      await database.withTransactionAsync(async () => {
        result = await task(database);
      });
      return result;
    });
  }

  return {
    withSession: (task) => checkOpen(() => task(database)),
    transaction,
    close: () => {
      closing ??= enqueue(() => database.closeAsync());
      return closing;
    },
  };
}
