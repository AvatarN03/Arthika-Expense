import { reconcile } from '../../domain/reconciliation';
import type { DatabaseClient } from '../client';
import type { Transaction } from './transactions';

export type Reconciliation = {
  id: string;
  sourceId: string;
  previousBalanceMinor: number;
  enteredBalanceMinor: number;
  differenceMinor: number;
  currencyCode: string;
  reason: string | null;
  adjustmentTransactionId: string | null;
  createdAt: string;
};

export type CreateReconciliation = {
  sourceId: string;
  previousBalanceMinor: number;
  enteredBalanceMinor: number;
  currencyCode: string;
  occurredAt: string;
  reason?: string | null;
};

type ReconciliationRow = {
  id: string;
  source_id: string;
  previous_balance_minor: number;
  entered_balance_minor: number;
  difference_minor: number;
  currency_code: string;
  reason: string | null;
  adjustment_transaction_id: string | null;
  created_at: string;
};

const columns = 'id, source_id, previous_balance_minor, entered_balance_minor, difference_minor, currency_code, reason, adjustment_transaction_id, created_at';

function fromRow(row: ReconciliationRow): Reconciliation {
  return {
    id: row.id,
    sourceId: row.source_id,
    previousBalanceMinor: row.previous_balance_minor,
    enteredBalanceMinor: row.entered_balance_minor,
    differenceMinor: row.difference_minor,
    currencyCode: row.currency_code,
    reason: row.reason,
    adjustmentTransactionId: row.adjustment_transaction_id,
    createdAt: row.created_at,
  };
}

function normalizeRequiredText(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    throw new Error(`${label} is required and cannot contain null characters.`);
  }
  return value.trim();
}

function normalizeOptionalText(value: string | null | undefined, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error(`${label} cannot contain null characters.`);
  }
  if (value.trim() === '') return null;
  return value.trim();
}

function normalizeInstant(value: string): string {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Reconciliation time must be an ISO timestamp with a timezone.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Reconciliation time must be a valid ISO timestamp.');
  }
  const canonical = parsed.toISOString();
  if (canonical.length !== 24) {
    throw new Error('Reconciliation time is outside the supported date range.');
  }
  return canonical;
}

export function createReconciliationRepository(client: DatabaseClient) {
  return {
    async create(input: CreateReconciliation): Promise<{
      reconciliation: Reconciliation;
      adjustment: Transaction | null;
    }> {
      const sourceId = normalizeRequiredText(input.sourceId, 'Source ID');
      const occurredAt = normalizeInstant(input.occurredAt);
      const reason = normalizeOptionalText(input.reason, 'Reason');

      const result = reconcile({
        previousBalanceMinor: input.previousBalanceMinor,
        enteredBalanceMinor: input.enteredBalanceMinor,
        currencyCode: input.currencyCode,
      });

      return client.transaction(async (session) => {
        const source = await session.getFirstAsync<{ id: string }>(
          'SELECT id FROM money_sources WHERE id = ? AND is_archived = 0', sourceId,
        );
        if (!source) throw new Error('The selected money source is unavailable.');

        let adjustmentId: string | null = null;
        if (result.adjustment) {
          const timestamp = new Date().toISOString();
          const adjustmentResult = await session.runAsync(
            `INSERT INTO transactions
              (type, direction, amount_minor, source_id, description, payment_method,
               occurred_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            'adjustment', result.adjustment.direction, result.adjustment.amountMinor,
            sourceId, reason ?? 'Reconciliation adjustment', null, occurredAt, timestamp, timestamp,
          );
          const adjustmentRow = await session.getFirstAsync<{ id: string }>(
            'SELECT id FROM transactions WHERE rowid = ?', adjustmentResult.lastInsertRowId,
          );
          if (!adjustmentRow) throw new Error('Unable to read the created adjustment.');
          adjustmentId = adjustmentRow.id;
        }

        const timestamp = new Date().toISOString();
        const reconciliationResult = await session.runAsync(
          `INSERT INTO reconciliations
            (source_id, previous_balance_minor, entered_balance_minor, difference_minor,
             currency_code, reason, adjustment_transaction_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          sourceId, result.previousBalanceMinor, result.enteredBalanceMinor,
          result.differenceMinor, result.currencyCode, reason, adjustmentId, timestamp,
        );
        const row = await session.getFirstAsync<ReconciliationRow>(
          `SELECT ${columns} FROM reconciliations WHERE rowid = ?`, reconciliationResult.lastInsertRowId,
        );
        if (!row) throw new Error('Unable to read the created reconciliation.');

        let adjustment: Transaction | null = null;
        if (adjustmentId) {
          const adjustmentRow = await session.getFirstAsync<{
            id: string; type: 'expense' | 'transfer' | 'adjustment'; direction: 'debit' | 'credit';
            amount_minor: number; source_id: string; description: string | null;
            payment_method: string | null; occurred_at: string; is_voided: number;
            transfer_id: string | null; created_at: string; updated_at: string;
          }>('SELECT id, type, direction, amount_minor, source_id, description, payment_method, occurred_at, is_voided, transfer_id, created_at, updated_at FROM transactions WHERE id = ?', adjustmentId);
          if (adjustmentRow) {
            adjustment = {
              id: adjustmentRow.id,
              type: adjustmentRow.type,
              direction: adjustmentRow.direction,
              amountMinor: adjustmentRow.amount_minor,
              sourceId: adjustmentRow.source_id,
              description: adjustmentRow.description,
              paymentMethod: adjustmentRow.payment_method,
              occurredAt: adjustmentRow.occurred_at,
              isVoided: adjustmentRow.is_voided === 1,
              transferId: adjustmentRow.transfer_id,
              createdAt: adjustmentRow.created_at,
              updatedAt: adjustmentRow.updated_at,
            };
          }
        }

        return { reconciliation: fromRow(row), adjustment };
      });
    },

    async list(sourceId?: string): Promise<Reconciliation[]> {
      const conditions: string[] = [];
      const parameters: string[] = [];
      if (sourceId !== undefined) {
        conditions.push('source_id = ?');
        parameters.push(normalizeRequiredText(sourceId, 'Source ID'));
      }
      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      const rows = await client.withSession((session) =>
        session.getAllAsync<ReconciliationRow>(
          `SELECT ${columns} FROM reconciliations${where} ORDER BY created_at DESC, id DESC`, ...parameters,
        ),
      );
      return rows.map(fromRow);
    },

    getById(id: string): Promise<Reconciliation | null> {
      const normalizedId = normalizeRequiredText(id, 'Reconciliation ID');
      return client.withSession(async (session) => {
        const row = await session.getFirstAsync<ReconciliationRow>(
          `SELECT ${columns} FROM reconciliations WHERE id = ?`, normalizedId,
        );
        return row ? fromRow(row) : null;
      });
    },
  };
}