import type { DatabaseClient, DatabaseSession } from '../client';

export type EmiFrequency = 'monthly' | 'weekly' | 'quarterly';
export type EmiStatus = 'active' | 'paused' | 'completed';

export type EmiSchedule = {
  id: string;
  name: string;
  amountMinor: number;
  currencyCode: string;
  sourceId: string;
  frequency: EmiFrequency;
  /** ISO date string YYYY-MM-DD — the first due date. */
  startDate: string;
  /** null means the schedule runs indefinitely. */
  totalOccurrences: number | null;
  status: EmiStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmiSchedule = {
  name: string;
  amountMinor: number;
  currencyCode: string;
  sourceId: string;
  frequency: EmiFrequency;
  startDate: string;
  totalOccurrences?: number | null;
  notes?: string | null;
};

export type UpdateEmiSchedule = Partial<
  Pick<EmiSchedule, 'name' | 'amountMinor' | 'notes' | 'totalOccurrences'>
>;

type EmiRow = {
  id: string;
  name: string;
  amount_minor: number;
  currency_code: string;
  source_id: string;
  frequency: EmiFrequency;
  start_date: string;
  total_occurrences: number | null;
  status: EmiStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const columns = [
  'id', 'name', 'amount_minor', 'currency_code', 'source_id',
  'frequency', 'start_date', 'total_occurrences', 'status', 'notes',
  'created_at', 'updated_at',
].join(', ');

function fromRow(row: EmiRow): EmiSchedule {
  return {
    id: row.id,
    name: row.name,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    sourceId: row.source_id,
    frequency: row.frequency,
    startDate: row.start_date,
    totalOccurrences: row.total_occurrences,
    status: row.status,
    notes: row.notes,
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

function normalizeOptionalText(value: string | null | undefined, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error(`${label} cannot contain null characters.`);
  }
  return value.trim() === '' ? null : value.trim();
}

function normalizeAmount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('EMI amount must be a positive safe integer in minor units.');
  }
  return value;
}

function normalizeCurrencyCode(value: string): string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new Error('Currency code must be three uppercase letters.');
  }
  return value;
}

function normalizeFrequency(value: string): EmiFrequency {
  if (!['monthly', 'weekly', 'quarterly'].includes(value)) {
    throw new Error("Frequency must be 'monthly', 'weekly', or 'quarterly'.");
  }
  return value as EmiFrequency;
}

function normalizeStartDate(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Start date must be a YYYY-MM-DD date string.');
  }
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error('Start date must be a valid calendar date.');
  }
  return value;
}

function normalizeTotalOccurrences(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Total occurrences must be a positive integer, or omitted for indefinite.');
  }
  return value;
}

async function find(session: DatabaseSession, id: string): Promise<EmiSchedule | null> {
  const row = await session.getFirstAsync<EmiRow>(
    `SELECT ${columns} FROM emi_schedules WHERE id = ?`, id,
  );
  return row ? fromRow(row) : null;
}

/** Call outside client callbacks: each method owns its queued session/transaction. */
export function createEmiScheduleRepository(client: DatabaseClient) {
  return {
    async create(input: CreateEmiSchedule): Promise<EmiSchedule> {
      const name = normalizeRequiredText(input.name, 'EMI name');
      const amountMinor = normalizeAmount(input.amountMinor);
      const currencyCode = normalizeCurrencyCode(input.currencyCode);
      const sourceId = normalizeRequiredText(input.sourceId, 'Source ID');
      const frequency = normalizeFrequency(input.frequency);
      const startDate = normalizeStartDate(input.startDate);
      const totalOccurrences = normalizeTotalOccurrences(input.totalOccurrences);
      const notes = normalizeOptionalText(input.notes, 'Notes');

      return client.transaction(async (session) => {
        const source = await session.getFirstAsync<{ id: string }>(
          'SELECT id FROM money_sources WHERE id = ? AND is_archived = 0', sourceId,
        );
        if (!source) throw new Error('The selected money source is unavailable.');

        const timestamp = new Date().toISOString();
        const result = await session.runAsync(
          `INSERT INTO emi_schedules
            (name, amount_minor, currency_code, source_id, frequency,
             start_date, total_occurrences, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
          name, amountMinor, currencyCode, sourceId, frequency,
          startDate, totalOccurrences, notes, timestamp, timestamp,
        );
        const row = await session.getFirstAsync<EmiRow>(
          `SELECT ${columns} FROM emi_schedules WHERE rowid = ?`, result.lastInsertRowId,
        );
        if (!row) throw new Error('Unable to read the created EMI schedule.');
        return fromRow(row);
      });
    },

    getById(id: string): Promise<EmiSchedule | null> {
      return client.withSession((session) =>
        find(session, normalizeRequiredText(id, 'EMI schedule ID')),
      );
    },

    async list(options: { status?: EmiStatus; sourceId?: string } = {}): Promise<EmiSchedule[]> {
      const conditions: string[] = [];
      const parameters: string[] = [];
      if (options.status !== undefined) {
        if (!['active', 'paused', 'completed'].includes(options.status)) {
          throw new Error('Status must be active, paused, or completed.');
        }
        conditions.push('status = ?');
        parameters.push(options.status);
      }
      if (options.sourceId !== undefined) {
        conditions.push('source_id = ?');
        parameters.push(normalizeRequiredText(options.sourceId, 'Source ID'));
      }
      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      return client.withSession(async (session) => {
        const rows = await session.getAllAsync<EmiRow>(
          `SELECT ${columns} FROM emi_schedules${where} ORDER BY start_date, created_at, id`,
          ...parameters,
        );
        return rows.map(fromRow);
      });
    },

    async updateDetails(id: string, input: UpdateEmiSchedule): Promise<EmiSchedule | null> {
      const normalizedId = normalizeRequiredText(id, 'EMI schedule ID');
      return client.transaction(async (session) => {
        const existing = await find(session, normalizedId);
        if (!existing) return null;

        const name = input.name !== undefined
          ? normalizeRequiredText(input.name, 'EMI name')
          : existing.name;
        const amountMinor = input.amountMinor !== undefined
          ? normalizeAmount(input.amountMinor)
          : existing.amountMinor;
        const totalOccurrences = input.totalOccurrences !== undefined
          ? normalizeTotalOccurrences(input.totalOccurrences)
          : existing.totalOccurrences;
        const notes = input.notes !== undefined
          ? normalizeOptionalText(input.notes, 'Notes')
          : existing.notes;

        const timestamp = new Date().toISOString();
        await session.runAsync(
          `UPDATE emi_schedules
             SET name = ?, amount_minor = ?, total_occurrences = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          name, amountMinor, totalOccurrences, notes, timestamp, normalizedId,
        );
        return find(session, normalizedId);
      });
    },

    async setStatus(id: string, status: EmiStatus): Promise<EmiSchedule | null> {
      const normalizedId = normalizeRequiredText(id, 'EMI schedule ID');
      if (!['active', 'paused', 'completed'].includes(status)) {
        throw new Error('Status must be active, paused, or completed.');
      }
      return client.transaction(async (session) => {
        const existing = await find(session, normalizedId);
        if (!existing) return null;
        const timestamp = new Date().toISOString();
        await session.runAsync(
          'UPDATE emi_schedules SET status = ?, updated_at = ? WHERE id = ?',
          status, timestamp, normalizedId,
        );
        return find(session, normalizedId);
      });
    },
  };
}
