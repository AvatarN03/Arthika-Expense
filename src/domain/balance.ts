/**
 * Pure tracked-balance rules. This module must not import React, Expo, SQLite,
 * or screen code; repositories and screens pass plain values into it.
 *
 * Every ledger entry is a positive amount plus a direction. Credits add to the
 * source balance and debits subtract from it. A transfer must therefore be
 * represented by a debit entry for the source losing money and a credit entry
 * for the source receiving it. This module performs the arithmetic only; it
 * cannot make a paired transfer write atomic, and it does not decide whether
 * archived or voided entries should be excluded.
 */

export type LedgerDirection = 'debit' | 'credit';

export type BalanceLedgerEntry = {
  sourceId: string;
  direction: LedgerDirection;
  amountMinor: number;
};

export type BalanceSource = {
  id: string;
  currencyCode: string;
  openingBalanceMinor: number;
};

export type SourceBalance = {
  sourceId: string;
  currencyCode: string;
  balanceMinor: number;
};

export type CurrencyTotal = {
  currencyCode: string;
  totalMinor: number;
};

export type TrackedBalances = {
  sources: SourceBalance[];
  totals: CurrencyTotal[];
};

function assertNonEmptyText(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
}

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

function signedAmountMinor(entry: BalanceLedgerEntry): number {
  assertNonEmptyText(entry.sourceId, 'Ledger source ID');
  if (entry.direction !== 'debit' && entry.direction !== 'credit') {
    throw new Error('Ledger direction must be debit or credit.');
  }
  assertSafeInteger(entry.amountMinor, 'Ledger amount');
  if (entry.amountMinor <= 0) {
    throw new Error('Ledger amount must be positive.');
  }
  return entry.direction === 'credit' ? entry.amountMinor : -entry.amountMinor;
}

export function calculateSourceBalanceMinor(
  source: Pick<BalanceSource, 'id' | 'openingBalanceMinor'>,
  entries: readonly BalanceLedgerEntry[],
): number {
  assertNonEmptyText(source.id, 'Source ID');
  assertSafeInteger(source.openingBalanceMinor, 'Opening balance');

  let balance = source.openingBalanceMinor;
  for (const entry of entries) {
    const amount = signedAmountMinor(entry);
    if (entry.sourceId === source.id) {
      balance += amount;
      assertSafeInteger(balance, 'Calculated source balance');
    }
  }
  return balance;
}

/**
 * Calculates each supplied source's balance and totals per currency. Sources
 * are not filtered by archive status here; the caller passes exactly the
 * sources whose balances it wants. Currencies are never converted or added
 * together.
 */
export function calculateTrackedBalances(
  sources: readonly BalanceSource[],
  entries: readonly BalanceLedgerEntry[],
): TrackedBalances {
  const byId = new Map<string, BalanceSource>();
  for (const source of sources) {
    assertNonEmptyText(source.id, 'Source ID');
    assertCurrencyCode(source.currencyCode);
    assertSafeInteger(source.openingBalanceMinor, 'Opening balance');
    if (byId.has(source.id)) {
      throw new Error(`Duplicate source ID: ${source.id}`);
    }
    byId.set(source.id, source);
  }

  const balanceById = new Map<string, number>();
  for (const source of sources) {
    balanceById.set(source.id, source.openingBalanceMinor);
  }

  for (const entry of entries) {
    const amount = signedAmountMinor(entry);
    if (!byId.has(entry.sourceId)) {
      throw new Error(`Ledger entry references an unknown source: ${entry.sourceId}`);
    }
    const next = (balanceById.get(entry.sourceId) ?? 0) + amount;
    assertSafeInteger(next, 'Calculated source balance');
    balanceById.set(entry.sourceId, next);
  }

  const sourceBalances = sources.map((source) => ({
    sourceId: source.id,
    currencyCode: source.currencyCode,
    balanceMinor: balanceById.get(source.id) as number,
  }));

  const totalByCurrency = new Map<string, number>();
  for (const source of sourceBalances) {
    const next = (totalByCurrency.get(source.currencyCode) ?? 0) + source.balanceMinor;
    assertSafeInteger(next, 'Calculated currency total');
    totalByCurrency.set(source.currencyCode, next);
  }

  const totals = [...totalByCurrency.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([currencyCode, totalMinor]) => ({ currencyCode, totalMinor }));

  return { sources: sourceBalances, totals };
}
