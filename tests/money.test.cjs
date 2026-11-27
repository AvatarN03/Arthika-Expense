require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { formatMinor, parseMajorToMinor } = require('../src/lib/money.ts');

test('decimal input converts to exact integer minor units', () => {
  assert.equal(parseMajorToMinor('42500'), 4250000);
  assert.equal(parseMajorToMinor('42,500.50'), 4250050);
  assert.equal(parseMajorToMinor('₹ 1,234.5'), 123450);
  assert.equal(parseMajorToMinor('12.'), 1200);
  assert.equal(parseMajorToMinor('0'), 0);
  assert.equal(parseMajorToMinor('-0'), 0);
  assert.equal(parseMajorToMinor('-1500.25'), -150025);
  assert.equal(parseMajorToMinor('90071992547409.91'), Number.MAX_SAFE_INTEGER);
});

test('invalid or unsafe decimal input is rejected', () => {
  for (const value of [
    '',
    '   ',
    'abc',
    '1.234',
    '1,2,3.4.5',
    '--1',
    '1e3',
    '.5',
    '+1',
    '90071992547409.92',
    '999999999999999999',
  ]) {
    assert.throws(() => parseMajorToMinor(value));
  }
});

test('formatMinor produces display text and rejects invalid values', () => {
  for (const value of [0, 4250000, -150025]) {
    const formatted = formatMinor(value, 'INR');
    assert.equal(typeof formatted, 'string');
    assert.ok(formatted.length > 0);
  }

  for (const value of [1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => formatMinor(value, 'INR'));
  }
  for (const currency of ['inr', 'IN', 'INRR', '']) {
    assert.throws(() => formatMinor(0, currency));
  }
});
