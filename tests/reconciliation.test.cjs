require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { reconcile } = require('../src/domain/reconciliation.ts');

test('positive difference becomes a credit adjustment', () => {
  const result = reconcile({
    previousBalanceMinor: 4000, enteredBalanceMinor: 4500, currencyCode: 'INR',
  });
  assert.equal(result.differenceMinor, 500);
  assert.deepEqual(result.adjustment, { direction: 'credit', amountMinor: 500 });
});

test('negative difference becomes a debit adjustment', () => {
  const result = reconcile({
    previousBalanceMinor: 4500, enteredBalanceMinor: 4000, currencyCode: 'INR',
  });
  assert.equal(result.differenceMinor, -500);
  assert.deepEqual(result.adjustment, { direction: 'debit', amountMinor: 500 });
});

test('equal balances produce no adjustment', () => {
  const result = reconcile({
    previousBalanceMinor: 4000, enteredBalanceMinor: 4000, currencyCode: 'INR',
  });
  assert.equal(result.differenceMinor, 0);
  assert.equal(result.adjustment, null);
});

test('zero and negative previous balances are valid', () => {
  const result = reconcile({
    previousBalanceMinor: -100, enteredBalanceMinor: 50, currencyCode: 'INR',
  });
  assert.equal(result.differenceMinor, 150);
  assert.deepEqual(result.adjustment, { direction: 'credit', amountMinor: 150 });
});

test('unsafe or non-integer money values are rejected', () => {
  for (const value of [1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => reconcile({
      previousBalanceMinor: value, enteredBalanceMinor: 0, currencyCode: 'INR',
    }));
    assert.throws(() => reconcile({
      previousBalanceMinor: 0, enteredBalanceMinor: value, currencyCode: 'INR',
    }));
  }
});

test('invalid currency code is rejected', () => {
  for (const currencyCode of ['inr', 'IN', 'INRR', '']) {
    assert.throws(() => reconcile({
      previousBalanceMinor: 0, enteredBalanceMinor: 0, currencyCode,
    }));
  }
});