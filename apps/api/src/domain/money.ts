export type MoneyCents = bigint;
export const MAX_MONEY_CENTS = 99999999999999n;

const MONEY_PATTERN = /^\d{1,12}(?:[.,]\d{1,2})?$/;
const SIGNED_MONEY_PATTERN = /^-?\d{1,12}(?:[.,]\d{1,2})?$/;

function parse(value: string, signed: boolean): MoneyCents {
  const normalized = value.trim().replace(',', '.');
  const pattern = signed ? SIGNED_MONEY_PATTERN : MONEY_PATTERN;
  if (!pattern.test(normalized)) throw new Error('Valor monetário inválido.');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const parts = unsigned.split('.');
  const whole = parts[0] ?? '0';
  const fraction = parts[1] ?? '';
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > MAX_MONEY_CENTS) throw new Error('Valor monetário excede o limite suportado.');
  return negative ? -cents : cents;
}

export function parseMoneyToCents(value: string): MoneyCents {
  return parse(value, false);
}

export function parseSignedMoneyToCents(value: string): MoneyCents {
  return parse(value, true);
}

export function formatCents(cents: MoneyCents): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

export function addCents(...values: MoneyCents[]): MoneyCents {
  return values.reduce((total, value) => total + value, 0n);
}
