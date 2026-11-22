import type { DatabaseSession } from '../client';

export async function createMoneySources(session: DatabaseSession): Promise<void> {
  await session.execAsync(`
    CREATE TABLE money_sources (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'wallet')),
      opening_balance_minor INTEGER NOT NULL CHECK (
        typeof(opening_balance_minor) = 'integer'
        AND opening_balance_minor BETWEEN -9007199254740991 AND 9007199254740991
      ),
      currency_code TEXT NOT NULL CHECK (
        length(currency_code) = 3 AND currency_code NOT GLOB '*[^A-Z]*'
      ),
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX money_sources_active_created
      ON money_sources(is_archived, created_at, id);
  `);
}
