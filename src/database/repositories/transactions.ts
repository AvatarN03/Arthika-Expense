import { validateExpense } from '../../domain/expense';
import type { DatabaseClient, DatabaseSession } from '../client';

export type TransactionType = 'expense' | 'transfer' | 'adjustment';
export type TransactionDirection = 'debit' | 'credit';

export type Transaction = {
  id: string;
  type: TransactionType;
  direction: TransactionDirection;
  amountMinor: number;
  sourceId: string;
  description: string | null;
  paymentMethod: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

type BaseCreateTransaction = {
  amountMinor: number;
  sourceId: string;
  occurredAt: string;
};

export type CreateExpense = BaseCreateTransaction & {
  description?: string | null;
  paymentMethod?: string | null;
};

export type CreateAdjustment = BaseCreateTransaction & {
  direction: TransactionDirection;
  description: string;
};

export type ListTransactionOptions = {
  sourceId?: string;
  type?: TransactionType;
  limit?: number;
};

export type TransactionLedgerEntry = {
  sourceId: string;
  direction: TransactionDirection;
  amountMinor: number;
};

type TransactionRow = {
  id: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount_minor: number;
  source_id: string;
  description: string | null;
  payment_method: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

type LedgerRow = {
  source_id: string;
  direction: TransactionDirection;
  amount_minor: number;
};

type NormalizedTransaction = {
  type: 'expense' | 'adjustment';
  direction: TransactionDirection;
  amountMinor: number;
  sourceId: string;
  description: string | null;
  paymentMethod: string | null;
  occurredAt: string;
};

const columns = [
  'id', 'type', 'direction', 'amount_minor', 'source_id', 'description',
  'payment_method', 'occurred_at', 'created_at', 'updated_at',
].join(', ');

function fromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    amountMinor: row.amount_minor,
    sourceId: row.source_id,
    description: row.description,
    paymentMethod: row.payment_method,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRequiredText(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    throw new Error(`${label} is required and cannot contain null characters.`);
  }
  return value.trim();
}

function normalizeAmount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Transaction amount must be a positive safe integer in minor units.');
  }
  return value;
}

function normalizeInstant(value: string): string {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Transaction time must be an ISO timestamp with a timezone.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Transaction time must be a valid ISO timestamp.');
  }
  const canonical = parsed.toISOString();
  if (canonical.length !== 24) {
    throw new Error('Transaction time is outside the supported date range.');
  }
  return canonical;
}

function normalizeBase(input: BaseCreateTransaction) {
  return {
    amountMinor: normalizeAmount(input.amountMinor),
    sourceId: normalizeRequiredText(input.sourceId, 'Source ID'),
    occurredAt: normalizeInstant(input.occurredAt),
  };
}

async function find(session: DatabaseSession, id: string): Promise<Transaction | null> {
  const row = await session.getFirstAsync<TransactionRow>(
    `SELECT ${columns} FROM transactions WHERE id = ?`, id,
  );
  return row ? fromRow(row) : null;
}

async function insert(
  client: DatabaseClient,
  input: NormalizedTransaction,
): Promise<Transaction> {
  return client.transaction(async (session) => {
    const source = await session.getFirstAsync<{ id: string }>(
      'SELECT id FROM money_sources WHERE id = ? AND is_archived = 0', input.sourceId,
    );
    if (!source) throw new Error('The selected money source is unavailable.');

    const timestamp = new Date().toISOString();
    const result = await session.runAsync(
      `INSERT INTO transactions
        (type, direction, amount_minor, source_id, description, payment_method,
         occurred_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.type, input.direction, input.amountMinor, input.sourceId,
      input.description, input.paymentMethod, input.occurredAt, timestamp, timestamp,
    );
    const row = await session.getFirstAsync<TransactionRow>(
      `SELECT ${columns} FROM transactions WHERE rowid = ?`, result.lastInsertRowId,
    );
    if (!row) throw new Error('Unable to read the created transaction.');
    return fromRow(row);
  });
}

/** Immutable transaction records; correction/void policy is deliberately deferred. */
export function createTransactionRepository(client: DatabaseClient) {
  return {
    createExpense(input: CreateExpense): Promise<Transaction> {
      const expense = validateExpense(input);
      return insert(client, {
        type: 'expense',
        direction: 'debit',
        amountMinor: expense.amountMinor,
        sourceId: expense.sourceId,
        description: expense.description,
        paymentMethod: expense.paymentMethod,
        occurredAt: expense.occurredAt,
      });
    },

    createAdjustment(input: CreateAdjustment): Promise<Transaction> {
      const base = normalizeBase(input);
      if (input.direction !== 'debit' && input.direction !== 'credit') {
        throw new Error('Adjustment direction must be debit or credit.');
      }
      return insert(client, {
        ...base,
        type: 'adjustment',
        direction: input.direction,
        description: normalizeRequiredText(input.description, 'Adjustment explanation'),
        paymentMethod: null,
      });
    },

    getById(id: string): Promise<Transaction | null> {
      return client.withSession((session) => find(session, id));
    },

    /**
     * Minimal source/direction/amount projection for balance calculation.
     * This is not the activity list and deliberately has no UI row limit.
     */
    listLedgerEntries(): Promise<TransactionLedgerEntry[]> {
      return client.withSession(async (session) => {
        const rows = await session.getAllAsync<LedgerRow>(
          'SELECT source_id, direction, amount_minor FROM transactions',
        );
        return rows.map((row) => ({
          sourceId: row.source_id,
          direction: row.direction,
          amountMinor: row.amount_minor,
        }));
      });
    },

    async list(options: ListTransactionOptions = {}): Promise<Transaction[]> {
      const limit = options.limit ?? 50;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Transaction list limit must be an integer from 1 to 100.');
      }
      const conditions: string[] = [];
      const parameters: (string | number)[] = [];
      if (options.sourceId !== undefined) {
        conditions.push('source_id = ?');
        parameters.push(normalizeRequiredText(options.sourceId, 'Source ID'));
      }
      if (options.type !== undefined) {
        if (!['expense', 'transfer', 'adjustment'].includes(options.type)) {
          throw new Error('Transaction type is invalid.');
        }
        conditions.push('type = ?');
        parameters.push(options.type);
      }
      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      const rows = await client.withSession((session) => session.getAllAsync<TransactionRow>(
        `SELECT ${columns} FROM transactions${where}
         ORDER BY occurred_at DESC, created_at DESC, id DESC LIMIT ?`,
        ...parameters, limit,
      ));
      return rows.map(fromRow);
    },
  };
}
