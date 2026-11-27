require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  calculateSourceBalanceMinor,
  calculateTrackedBalances,
} = require('../src/domain/balance.ts');

const bank = { id: 'bank', currencyCode: 'INR', openingBalanceMinor: 50000 };
const cash = { id: 'cash', currencyCode: 'INR', openingBalanceMinor: 2000 };

test('opening balances and signed ledger effects calculate per-source balances', () => {
  const entries = [
    { sourceId: 'bank', direction: 'debit', amountMinor: 840 },
    { sourceId: 'bank', direction: 'credit', amountMinor: 125 },
    { sourceId: 'cash', direction: 'debit', amountMinor: 250 },
  ];

  assert.equal(calculateSourceBalanceMinor(bank, entries), 49285);
  assert.equal(calculateSourceBalanceMinor(cash, entries), 1750);
});

test('per-source calculation ignores other sources entries', () => {
  const entries = [
    { sourceId: 'cash', direction: 'credit', amountMinor: 999 },
    { sourceId: 'bank', direction: 'debit', amountMinor: 100 },
  ];

  assert.equal(calculateSourceBalanceMinor(bank, entries), 49900);
});

test('tracked balances keep currency totals separate without conversion', () => {
  const usd = { id: 'usd', currencyCode: 'USD', openingBalanceMinor: 1000 };
  const result = calculateTrackedBalances([bank, cash, usd], [
    { sourceId: 'bank', direction: 'debit', amountMinor: 500 },
    { sourceId: 'usd', direction: 'credit', amountMinor: 100 },
  ]);

  assert.deepEqual(result, {
    sources: [
      { sourceId: 'bank', currencyCode: 'INR', balanceMinor: 49500 },
      { sourceId: 'cash', currencyCode: 'INR', balanceMinor: 2000 },
      { sourceId: 'usd', currencyCode: 'USD', balanceMinor: 1100 },
    ],
    totals: [
      { currencyCode: 'INR', totalMinor: 51500 },
      { currencyCode: 'USD', totalMinor: 1100 },
    ],
  });
});

test('paired transfer effects preserve the currency total', () => {
  const result = calculateTrackedBalances([bank, cash], [
    { sourceId: 'bank', direction: 'debit', amountMinor: 2000 },
    { sourceId: 'cash', direction: 'credit', amountMinor: 2000 },
  ]);

  assert.deepEqual(result.sources.map((source) => source.balanceMinor), [48000, 4000]);
  assert.deepEqual(result.totals, [{ currencyCode: 'INR', totalMinor: 52000 }]);
});

test('negative and zero opening balances are valid without entries', () => {
  const overdrawn = { id: 'overdrawn', currencyCode: 'INR', openingBalanceMinor: -1500 };
  const empty = { id: 'empty', currencyCode: 'INR', openingBalanceMinor: 0 };

  assert.deepEqual(calculateTrackedBalances([overdrawn, empty], []), {
    sources: [
      { sourceId: 'overdrawn', currencyCode: 'INR', balanceMinor: -1500 },
      { sourceId: 'empty', currencyCode: 'INR', balanceMinor: 0 },
    ],
    totals: [{ currencyCode: 'INR', totalMinor: -1500 }],
  });
  assert.deepEqual(calculateTrackedBalances([], []), { sources: [], totals: [] });
});

test('safe-integer amounts are preserved exactly', () => {
  const large = {
    id: 'large',
    currencyCode: 'INR',
    openingBalanceMinor: Number.MAX_SAFE_INTEGER - 10,
  };
  const result = calculateTrackedBalances([large], [
    { sourceId: 'large', direction: 'debit', amountMinor: 10 },
  ]);

  assert.equal(result.sources[0].balanceMinor, Number.MAX_SAFE_INTEGER - 20);
  assert.equal(result.totals[0].totalMinor, Number.MAX_SAFE_INTEGER - 20);
});

test('invalid sources, entries, unknown references and unsafe overflow are rejected', () => {
  const validSource = { id: 'bank', currencyCode: 'INR', openingBalanceMinor: 100 };

  const invalidSources = [
    { ...validSource, id: '' },
    { ...validSource, id: '   ' },
    { ...validSource, currencyCode: 'inr' },
    { ...validSource, currencyCode: 'IN' },
    { ...validSource, currencyCode: 'INRR' },
    { ...validSource, openingBalanceMinor: 1.5 },
    { ...validSource, openingBalanceMinor: Number.MAX_SAFE_INTEGER + 1 },
    { ...validSource, openingBalanceMinor: Number.NaN },
    { ...validSource, openingBalanceMinor: Number.POSITIVE_INFINITY },
  ];
  for (const source of invalidSources) {
    assert.throws(() => calculateTrackedBalances([source], []));
  }
  assert.throws(
    () => calculateTrackedBalances([validSource, validSource], []),
    /Duplicate source ID/,
  );

  const invalidEntries = [
    { sourceId: '', direction: 'credit', amountMinor: 1 },
    { sourceId: 'bank', direction: 'up', amountMinor: 1 },
    { sourceId: 'bank', direction: 'debit', amountMinor: 0 },
    { sourceId: 'bank', direction: 'debit', amountMinor: -1 },
    { sourceId: 'bank', direction: 'debit', amountMinor: 1.5 },
    { sourceId: 'bank', direction: 'debit', amountMinor: Number.MAX_SAFE_INTEGER + 1 },
    { sourceId: 'bank', direction: 'debit', amountMinor: Number.NaN },
  ];
  for (const entry of invalidEntries) {
    assert.throws(() => calculateSourceBalanceMinor(validSource, [entry]));
    assert.throws(() => calculateTrackedBalances([validSource], [entry]));
  }

  assert.throws(
    () => calculateTrackedBalances([validSource], [
      { sourceId: 'missing', direction: 'credit', amountMinor: 1 },
    ]),
    /unknown source/,
  );
  assert.throws(
    () => calculateTrackedBalances(
      [{ ...validSource, openingBalanceMinor: Number.MAX_SAFE_INTEGER }],
      [{ sourceId: 'bank', direction: 'credit', amountMinor: 1 }],
    ),
    /safe integer/,
  );
  assert.throws(
    () => calculateTrackedBalances(
      [validSource, { ...validSource, id: 'cash', openingBalanceMinor: Number.MAX_SAFE_INTEGER }],
      [],
    ),
    /safe integer/,
  );
});

test('balance calculation does not mutate its inputs', () => {
  const sources = [{ id: 'bank', currencyCode: 'INR', openingBalanceMinor: 100 }];
  const entries = [{ sourceId: 'bank', direction: 'debit', amountMinor: 25 }];
  const sourcesBefore = JSON.parse(JSON.stringify(sources));
  const entriesBefore = JSON.parse(JSON.stringify(entries));

  calculateTrackedBalances(sources, entries);

  assert.deepEqual(sources, sourcesBefore);
  assert.deepEqual(entries, entriesBefore);
});
