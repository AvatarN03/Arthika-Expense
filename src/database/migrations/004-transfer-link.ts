import type { DatabaseSession } from '../client';

export async function addTransferLink(session: DatabaseSession): Promise<void> {
  // Links the two rows of an atomic transfer (one debit, one credit) together.
  // NULL for ordinary expenses/adjustments; the 32-char lowercase hex ID of the
  // transfer's debit row otherwise.
  await session.execAsync(`
    ALTER TABLE transactions ADD COLUMN transfer_id TEXT;
    CREATE INDEX transactions_transfer_id ON transactions(transfer_id);
  `);
}