import type { DatabaseSession } from '../client';

export async function addVoidedToTransactions(session: DatabaseSession): Promise<void> {
  // A voided transaction is excluded from balance calculation but preserved in
  // history. Corrections create an equal-and-opposite reversing entry rather
  // than deleting or rewriting the original record.
  await session.execAsync(`
    ALTER TABLE transactions ADD COLUMN is_voided INTEGER NOT NULL DEFAULT 0
      CHECK (is_voided IN (0, 1));
  `);
}