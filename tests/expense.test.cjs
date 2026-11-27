require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateExpense } = require('../src/domain/expense.ts');

const validInput = {
  amountMinor: 840,
  sourceId: 'abc',
  occurredAt: '2026-11-22T10:30:00+05:30',
  description: '  Groceries  ',
  paymentMethod: '  UPI  ',
};

test('valid expense normalizes text and timestamp', () => {
  const result = validateExpense(validInput);
  assert.equal(result.amountMinor, 840);
  assert.equal(result.sourceId, 'abc');
  assert.equal(result.occurredAt, '2026-11-22T05:00:00.000Z');
  assert.equal(result.description, 'Groceries');
  assert.equal(result.paymentMethod, 'UPI');
});

test('optional description and payment method may be omitted or blank', () => {
  const minimal = validateExpense({ amountMinor: 10, sourceId: 's', occurredAt: '2026-11-22T10:00:00Z' });
  assert.deepEqual({ description: minimal.description, paymentMethod: minimal.paymentMethod }, {
    description: null, paymentMethod: null,
  });
  const blank = validateExpense({
    amountMinor: 10, sourceId: 's', occurredAt: '2026-11-22T10:00:00Z',
    description: '   ', paymentMethod: '',
  });
  assert.deepEqual({ description: blank.description, paymentMethod: blank.paymentMethod }, {
    description: null, paymentMethod: null,
  });
});

test('expense amount must be a positive safe integer', () => {
  for (const amountMinor of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
    assert.throws(() => validateExpense({ ...validInput, amountMinor }), /amount/i);
  }
});

test('source ID must be non-empty text', () => {
  for (const sourceId of ['', '   ', '\0']) {
    assert.throws(() => validateExpense({ ...validInput, sourceId }));
  }
});

test('occurred-at must be a valid ISO timestamp with a timezone', () => {
  for (const occurredAt of ['', '2026-11-22T10:00:00', 'not-a-date', '2026-11-22T10:00:00+99:99']) {
    assert.throws(() => validateExpense({ ...validInput, occurredAt }));
  }
});

test('description and payment method reject null characters and non-strings', () => {
  for (const description of ['bad\0text', 100]) {
    assert.throws(() => validateExpense({ ...validInput, description }));
  }
  for (const paymentMethod of ['bad\0method', 100]) {
    assert.throws(() => validateExpense({ ...validInput, paymentMethod }));
  }
});