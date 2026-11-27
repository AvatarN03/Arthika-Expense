import type { DatabaseSession } from '../client';

export async function createTransactions(session: DatabaseSession): Promise<void> {
  await session.execAsync(`
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      type TEXT NOT NULL CHECK (type IN ('expense', 'transfer', 'adjustment')),
      direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
      amount_minor INTEGER NOT NULL CHECK (
        typeof(amount_minor) = 'integer'
        AND amount_minor BETWEEN 1 AND 9007199254740991
      ),
      source_id TEXT NOT NULL REFERENCES money_sources(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      description TEXT CHECK (
        description IS NULL
        OR (length(trim(description)) > 0 AND instr(description, char(0)) = 0)
      ),
      payment_method TEXT CHECK (
        payment_method IS NULL
        OR (length(trim(payment_method)) > 0 AND instr(payment_method, char(0)) = 0)
      ),
      occurred_at TEXT NOT NULL CHECK (
        length(occurred_at) = 24
        AND substr(occurred_at, 24, 1) = 'Z'
        AND julianday(occurred_at) IS NOT NULL
      ),
      created_at TEXT NOT NULL CHECK (
        length(created_at) = 24
        AND substr(created_at, 24, 1) = 'Z'
        AND julianday(created_at) IS NOT NULL
      ),
      updated_at TEXT NOT NULL CHECK (
        length(updated_at) = 24
        AND substr(updated_at, 24, 1) = 'Z'
        AND julianday(updated_at) IS NOT NULL
      ),
      CHECK (type <> 'expense' OR direction = 'debit')
    );
    CREATE INDEX transactions_source_occurred
      ON transactions(source_id, occurred_at DESC, id DESC);
    CREATE INDEX transactions_type_occurred
      ON transactions(type, occurred_at DESC, id DESC);
  `);
}
