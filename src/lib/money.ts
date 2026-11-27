/**
 * Display/input helpers for money stored as integer minor units.
 *
 * Persisted money arithmetic belongs in the domain/repository layers. These
 * helpers only translate a user-entered decimal string into minor units and
 * format a minor-unit value for display.
 */

const MINOR_UNITS_PER_MAJOR = 100;
const SEPARATORS = /[,\s₹$€£¥]/g;

export function parseMajorToMinor(input: string): number {
  const normalized = input.trim().replace(SEPARATORS, '');
  if (!normalized) {
    throw new Error('Enter an amount.');
  }
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Enter an amount with up to two decimal places.');
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const whole = Number(wholePart);
  if (!Number.isSafeInteger(whole)) {
    throw new Error('Amount is too large.');
  }

  const fraction = Number(fractionPart.padEnd(2, '0'));
  const minor = whole * MINOR_UNITS_PER_MAJOR + fraction;
  if (!Number.isSafeInteger(minor)) {
    throw new Error('Amount is too large.');
  }

  return negative && minor !== 0 ? -minor : minor;
}

export function formatMinor(minor: number, currencyCode: string): string {
  if (!Number.isSafeInteger(minor)) {
    throw new Error('Amount must be a safe integer in minor units.');
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error('Currency code must be three uppercase letters.');
  }

  // Display-only division; persisted/calculated money stays in integer minor units.
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / MINOR_UNITS_PER_MAJOR);
}
