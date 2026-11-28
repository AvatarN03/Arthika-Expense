import type { DatabaseSession } from '../client';

export async function createReconciliations(session: DatabaseSession): Promise<void> {
  // Records a balance reconciliation event: the tracked balance observed, the
  // actual balance entered, their difference, an optional reason, and the
  // linked adjustment transaction (if any). Historical transactions are never
  // rewritten; the difference is applied once through that adjustment.
  await session.execAsync(`
    CREATE TABLE reconciliations (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      source_id TEXT NOT NULL REFERENCES money_sources(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      previous_balance_minor INTEGER NOT NULL CHECK (
        typeof(previous_balance_minor) = 'integer'
      ),
      entered_balance_minor INTEGER NOT NULL CHECK (
        typeof(entered_balance_minor) = 'integer'
      ),
      difference_minor INTEGER NOT NULL CHECK (
        typeof(difference_minor) = 'integer'
      ),
      currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
      reason TEXT CHECK (
        reason IS NULL OR (length(trim(reason)) > 0 AND instr(reason, char(0)) = 0)
      ),
      adjustment_transaction_id TEXT REFERENCES transactions(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      created_at TEXT NOT NULL CHECK (
        length(created_at) = 24
        AND substr(created_at, 24, 1) = 'Z'
        AND julianday(created_at) IS NOT NULL
      ),
      CHECK (adjustment_transaction_id IS NULL OR difference_minor <> 0)
    );
    CREATE INDEX reconciliations_source_created
      ON reconciliations(source_id, created_at DESC, id DESC);
  `);
}