require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  validateTransfer,
  transferLedgerEffects,
} = require('../src/domain/transfer.ts');
const { calculateTrackedBalances } = require('../src/domain/balance.ts');

const validInput = {
  fromSourceId: 'source-a',
  toSourceId: 'source-b',
  amountMinor: 5000,
  occurredAt: '2026-11-22T10:30:00+05:30',
};

test('valid transfer normalizes and requires distinct sources', () => {
  const result = validateTransfer(validInput);
  assert.deepEqual(result, {
    fromSourceId: 'source-a',
    toSourceId: 'source-b',
    amountMinor: 5000,
    occurredAt: '2026-11-22T05:00:00.000Z',
  });
});

test('source and destination must differ', () => {
  assert.throws(() => validateTransfer({ ...validInput, fromSourceId: 'source-b' }), /different/);
  assert.throws(() => validateTransfer({ ...validInput, toSourceId: 'source-a' }), /different/);
});

test('transfer amount must be a positive safe integer', () => {
  for (const amountMinor of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
    assert.throws(() => validateTransfer({ ...validInput, amountMinor }), /amount/i);
  }
});

test('source and destination must be non-empty text', () => {
  for (const patch of [{ fromSourceId: '' }, { toSourceId: '   ' }, { fromSourceId: '\0' }]) {
    assert.throws(() => validateTransfer({ ...validInput, ...patch }));
  }
});

test('occurred-at must be a valid ISO timestamp with a timezone', () => {
  for (const occurredAt of ['', '2026-11-22T10:00:00', 'not-a-date', '2026-11-22T10:00:00+99:99']) {
    assert.throws(() => validateTransfer({ ...validInput, occurredAt }));
  }
});

test('transfer effects are a net-zero pair of opposite signs', () => {
  const normalized = validateTransfer(validInput);
  const effects = transferLedgerEffects(normalized);
  assert.deepEqual(effects.debit, {
    sourceId: 'source-a', direction: 'debit', amountMinor: 5000,
  });
  assert.deepEqual(effects.credit, {
    sourceId: 'source-b', direction: 'credit', amountMinor: 5000,
  });

  // Feeding both effects into the balance module leaves the total unchanged.
  const result = calculateTrackedBalances(
    [
      { id: 'source-a', currencyCode: 'INR', openingBalanceMinor: 10000 },
      { id: 'source-b', currencyCode: 'INR', openingBalanceMinor: 2000 },
    ],
    [effects.debit, effects.credit],
  );
  assert.deepEqual(result.totals, [{ currencyCode: 'INR', totalMinor: 12000 }]);
  assert.deepEqual(result.sources, [
    { sourceId: 'source-a', currencyCode: 'INR', balanceMinor: 5000 },
    { sourceId: 'source-b', currencyCode: 'INR', balanceMinor: 7000 },
  ]);
});