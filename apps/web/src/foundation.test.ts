import { describe, expect, it } from 'vitest';
import { formatMoney } from './lib/money';

describe('web foundation', () => {
  it('is configured for the first product phase', () => {
    expect('foundation').toBe('foundation');
  });

  it('formats large decimal strings without floating-point rounding', () => {
    expect(formatMoney('999999999999.99')).toBe('R$ 999.999.999.999,99');
    expect(formatMoney('-0.01')).toBe('-R$ 0,01');
  });
});
