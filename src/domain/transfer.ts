/**
 * Pure transfer rules. This module must not import React, Expo, SQLite, or
 * screen code; repositories and screens pass plain values into it.
 *
 * A transfer moves money between two owned sources. It is never an expense and
 * never changes total tracked money: the source loses `amountMinor` and the
 * destination gains the same `amountMinor`. Exactly one source and one
 * destination are required, and they must differ. The two ledger effects are
 * returned together so Phase 5.2 can persist them atomically.
 */

import type { BalanceLedgerEntry } from './balance';

export type TransferInput = {
  fromSourceId: string;
  toSourceId: string;
  amountMinor: number;
  occurredAt: string;
};

export type NormalizedTransfer = {
  fromSourceId: string;
  toSourceId: string;
  amountMinor: number;
  occurredAt: string;
};

export type TransferEffects = {
  /** Debit on the source: money leaves it. */
  debit: BalanceLedgerEntry;
  /** Credit on the destination: money arrives there. */
  credit: BalanceLedgerEntry;
};

function normalizeRequiredText(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    throw new Error(`${label} is required and cannot contain null characters.`);
  }
  return value.trim();
}

function normalizeAmount(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Transfer amount must be a positive safe integer in minor units.');
  }
  return value;
}

function normalizeInstant(value: string): string {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Transfer time must be an ISO timestamp with a timezone.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Transfer time must be a valid ISO timestamp.');
  }
  const canonical = parsed.toISOString();
  if (canonical.length !== 24) {
    throw new Error('Transfer time is outside the supported date range.');
  }
  return canonical;
}

/**
 * Validates and normalizes a user-supplied transfer. Returns the exact values
 * a repository should persist, or throws a descriptive error for the first
 * invalid field.
 */
export function validateTransfer(input: TransferInput): NormalizedTransfer {
  const fromSourceId = normalizeRequiredText(input.fromSourceId, 'Source');
  const toSourceId = normalizeRequiredText(input.toSourceId, 'Destination');
  if (fromSourceId === toSourceId) {
    throw new Error('Source and destination must be different.');
  }
  return {
    fromSourceId,
    toSourceId,
    amountMinor: normalizeAmount(input.amountMinor),
    occurredAt: normalizeInstant(input.occurredAt),
  };
}

/**
 * Derives the two balanced ledger effects for a validated transfer: a debit on
 * the source and an equal credit on the destination. Because the amounts are
 * equal and opposite, a tracked-balance total across both sources is unchanged.
 */
export function transferLedgerEffects(transfer: NormalizedTransfer): TransferEffects {
  return {
    debit: {
      sourceId: transfer.fromSourceId,
      direction: 'debit',
      amountMinor: transfer.amountMinor,
    },
    credit: {
      sourceId: transfer.toSourceId,
      direction: 'credit',
      amountMinor: transfer.amountMinor,
    },
  };
}