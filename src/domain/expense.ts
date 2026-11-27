/**
 * Pure expense validation and normalization. This module must not import
 * React, Expo, SQLite, or screen code; screens and repositories call it with
 * plain values and it returns a typed, normalized expense or throws.
 *
 * An expense debits its source: the ledger amount is a positive magnitude and
 * the direction is supplied by the persistence layer. This module only checks
 * the user-facing inputs and normalizes them so a repository can store them.
 */

export type ExpenseInput = {
  amountMinor: number;
  sourceId: string;
  occurredAt: string;
  description?: string | null;
  paymentMethod?: string | null;
};

export type NormalizedExpense = {
  amountMinor: number;
  sourceId: string;
  occurredAt: string;
  description: string | null;
  paymentMethod: string | null;
};

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

function normalizeAmount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Expense amount must be a positive safe integer in minor units.');
  }
  return value;
}

function normalizeInstant(value: string): string {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Expense time must be an ISO timestamp with a timezone.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Expense time must be a valid ISO timestamp.');
  }
  const canonical = parsed.toISOString();
  if (canonical.length !== 24) {
    throw new Error('Expense time is outside the supported date range.');
  }
  return canonical;
}

/**
 * Validates and normalizes a user-supplied expense. Returns the exact values a
 * repository should persist, or throws a descriptive error for the first
 * invalid field. This is deliberately a pure function with no I/O.
 */
export function validateExpense(input: ExpenseInput): NormalizedExpense {
  return {
    amountMinor: normalizeAmount(input.amountMinor),
    sourceId: normalizeRequiredText(input.sourceId, 'Source ID'),
    occurredAt: normalizeInstant(input.occurredAt),
    description: normalizeOptionalText(input.description, 'Description'),
    paymentMethod: normalizeOptionalText(input.paymentMethod, 'Payment method'),
  };
}