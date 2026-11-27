/**
 * Pure correction rules for the void-and-reverse policy. This module must not
 * import React, Expo, SQLite, or screen code; the repository calls it with plain
 * values and it returns the reversing entry description/amount or throws.
 *
 * Voiding a transaction never deletes or rewrites it. The original is marked
 * voided and excluded from balance calculation; an equal-and-opposite
 * reversing entry restores the tracked total. This keeps history auditable and
 * makes the correction itself visible in activity.
 */

export type VoidableTransaction = {
  id: string;
  type: 'expense' | 'transfer' | 'adjustment';
  direction: 'debit' | 'credit';
  amountMinor: number;
  isVoided: boolean;
  description: string | null;
};

export type VoidCorrection = {
  originalId: string;
  reversalDirection: 'debit' | 'credit';
  amountMinor: number;
  reason: string;
};

function normalizeReason(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'Voided by user';
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error('Void reason cannot contain null characters.');
  }
  const trimmed = value.trim();
  return trimmed === '' ? 'Voided by user' : trimmed;
}

/**
 * Validates that `original` can be voided and returns the equal-and-opposite
 * reversal to create. The repository performs the actual writes atomically.
 */
export function buildVoidCorrection(
  original: VoidableTransaction,
  reason?: string | null,
): VoidCorrection {
  if (original.isVoided) {
    throw new Error('This transaction is already voided.');
  }
  if (original.type === 'transfer') {
    throw new Error('Transfer correction is not supported yet.');
  }
  if (!Number.isSafeInteger(original.amountMinor) || original.amountMinor <= 0) {
    throw new Error('Cannot void a transaction with an invalid amount.');
  }
  if (typeof original.id !== 'string' || !original.id.trim()) {
    throw new Error('A transaction ID is required.');
  }

  return {
    originalId: original.id,
    reversalDirection: original.direction === 'debit' ? 'credit' : 'debit',
    amountMinor: original.amountMinor,
    reason: normalizeReason(reason),
  };
}