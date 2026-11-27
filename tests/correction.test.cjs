require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildVoidCorrection } = require('../src/domain/correction.ts');

const base = { id: 'tx-1', type: 'expense', direction: 'debit', amountMinor: 840, isVoided: false, description: 'Groceries' };

test('voiding an expense produces an equal-and-opposite credit', () => {
  const result = buildVoidCorrection(base, 'wrong amount');
  assert.deepEqual(result, {
    originalId: 'tx-1', reversalDirection: 'credit', amountMinor: 840, reason: 'wrong amount',
  });
});

test('voiding a credit produces a debit reversal', () => {
  const result = buildVoidCorrection(
    { ...base, type: 'adjustment', direction: 'credit' }, '',
  );
  assert.equal(result.reversalDirection, 'debit');
  assert.equal(result.reason, 'Voided by user');
});

test('already-voided transactions cannot be voided again', () => {
  assert.throws(() => buildVoidCorrection({ ...base, isVoided: true }), /already voided/);
});

test('transfers are not supported yet', () => {
  assert.throws(() => buildVoidCorrection({ ...base, type: 'transfer' }), /not supported/);
});

test('invalid amounts are rejected', () => {
  for (const amountMinor of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => buildVoidCorrection({ ...base, amountMinor }));
  }
});

test('a transaction ID is required', () => {
  assert.throws(() => buildVoidCorrection({ ...base, id: '' }));
  assert.throws(() => buildVoidCorrection({ ...base, id: '   ' }));
});

test('null characters in the reason are rejected', () => {
  assert.throws(() => buildVoidCorrection(base, 'bad\0reason'));
});