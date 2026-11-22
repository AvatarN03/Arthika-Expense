import type { DatabaseClient, DatabaseSession } from '../client';

export type MoneySourceType = 'bank' | 'cash' | 'wallet';

export type MoneySource = {
  id: string;
  name: string;
  type: MoneySourceType;
  openingBalanceMinor: number;
  currencyCode: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SourceDetails = Pick<MoneySource, 'name' | 'type'>;
export type CreateMoneySource = SourceDetails &
  Pick<MoneySource, 'openingBalanceMinor' | 'currencyCode'>;

type SourceRow = {
  id: string;
  name: string;
  type: MoneySourceType;
  opening_balance_minor: number;
  currency_code: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

const columns = 'id, name, type, opening_balance_minor, currency_code, is_archived, created_at, updated_at';

function fromRow(row: SourceRow): MoneySource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalanceMinor: row.opening_balance_minor,
    currencyCode: row.currency_code,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDetails(input: SourceDetails): SourceDetails {
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.includes('\0')) {
    throw new Error('A source name is required and cannot contain null characters.');
  }
  if (!['bank', 'cash', 'wallet'].includes(input.type)) {
    throw new Error('Source type must be bank, cash, or wallet.');
  }
  return { name: input.name.trim(), type: input.type };
}

async function find(session: DatabaseSession, id: string): Promise<MoneySource | null> {
  const row = await session.getFirstAsync<SourceRow>(
    `SELECT ${columns} FROM money_sources WHERE id = ?`, id,
  );
  return row ? fromRow(row) : null;
}

/** Call outside client callbacks: each method owns its queued session/transaction. */
export function createMoneySourceRepository(client: DatabaseClient) {
  return {
    async create(input: CreateMoneySource): Promise<MoneySource> {
      // Snapshot/validate before joining the queue; callers may later mutate form state.
      const { name, type } = normalizeDetails(input);
      const { openingBalanceMinor } = input;
      if (!Number.isSafeInteger(openingBalanceMinor)) {
        throw new Error('Opening balance must be a safe integer in minor units.');
      }
      if (typeof input.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(input.currencyCode)) {
        throw new Error('An explicit three-letter uppercase currency code is required.');
      }
      const currencyCode = input.currencyCode;
      return client.transaction(async (session) => {
        const timestamp = new Date().toISOString();
        const inserted = await session.runAsync(
          `INSERT INTO money_sources
            (name, type, opening_balance_minor, currency_code, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          name, type, openingBalanceMinor, currencyCode, timestamp, timestamp,
        );
        const row = await session.getFirstAsync<SourceRow>(
          `SELECT ${columns} FROM money_sources WHERE rowid = ?`, inserted.lastInsertRowId,
        );
        if (!row) throw new Error('Unable to read the created source.');
        return fromRow(row);
      });
    },

    getById(id: string): Promise<MoneySource | null> {
      // Archived sources deliberately remain resolvable by stable ID.
      return client.withSession((session) => find(session, id));
    },

    async list({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<MoneySource[]> {
      const sql = includeArchived
        ? `SELECT ${columns} FROM money_sources ORDER BY created_at, id`
        : `SELECT ${columns} FROM money_sources WHERE is_archived = 0 ORDER BY created_at, id`;
      return client.withSession(async (session) => (await session.getAllAsync<SourceRow>(sql)).map(fromRow));
    },

    async updateDetails(id: string, input: SourceDetails): Promise<MoneySource | null> {
      const { name, type } = normalizeDetails(input);
      return client.transaction(async (session) => {
        // Opening balance and currency are intentionally not editable here.
        await session.runAsync(
          'UPDATE money_sources SET name = ?, type = ?, updated_at = ? WHERE id = ?',
          name, type, new Date().toISOString(), id,
        );
        return find(session, id);
      });
    },

    archive(id: string): Promise<MoneySource | null> {
      return client.transaction(async (session) => {
        await session.runAsync(
          'UPDATE money_sources SET is_archived = 1, updated_at = ? WHERE id = ? AND is_archived = 0',
          new Date().toISOString(), id,
        );
        return find(session, id);
      });
    },
  };
}
