/**
 * Pure reconciliation rules. This module must not import React, Expo, SQLite,
 * or screen code; screens and repositories pass plain values into it.
 *
 * Reconciliation compares a tracked balance (computed from recorded entries)
 * with the actual amount the user observes and enters. The difference is
 * applied exactly once as a debit/credit adjustment; historical transactions
 * are never rewritten or deleted.
 */

export type ReconciliationInput = {
  previousBalanceMinor: number;
  enteredBalanceMinor: number;
  currencyCode: string;
};

export type ReconciliationAdjustment = {
  direction: 'debit' | 'credit';
  amountMinor: number;
};

export type ReconciliationResult = {
  previousBalanceMinor: number;
  enteredBalanceMinor: number;
  currencyCode: string;
  differenceMinor: number;
  /** The adjustment to apply, or null when the two balances already agree. */
  adjustment: ReconciliationAdjustment | null;
};

function assertSafeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer in minor units.`);
  }
}

function assertCurrencyCode(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new Error('Currency code must be three uppercase letters.');
  }
}

/**
 * Calculates the difference between the entered (observed) balance and the
 * previously tracked balance, and derives the single adjustment that reconciles
 * them. A positive difference becomes a credit adjustment; a negative
 * difference becomes a debit adjustment; zero means no adjustment is needed.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  assertSafeInteger(input.previousBalanceMinor, 'Previous balance');
  assertSafeInteger(input.enteredBalanceMinor, 'Entered balance');
  assertCurrencyCode(input.currencyCode);

  const differenceMinor = input.enteredBalanceMinor - input.previousBalanceMinor;
  if (!Number.isSafeInteger(differenceMinor)) {
    throw new Error('Reconciliation difference is outside the safe-integer range.');
  }

  let adjustment: ReconciliationAdjustment | null = null;
  if (differenceMinor > 0) {
    adjustment = { direction: 'credit', amountMinor: differenceMinor };
  } else if (differenceMinor < 0) {
    adjustment = { direction: 'debit', amountMinor: -differenceMinor };
  }

  return {
    previousBalanceMinor: input.previousBalanceMinor,
    enteredBalanceMinor: input.enteredBalanceMinor,
    currencyCode: input.currencyCode,
    differenceMinor,
    adjustment,
  };
}