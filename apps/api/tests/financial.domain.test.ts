import { describe, expect, it } from 'vitest';
import {
  balanceFromEntries,
  percentageChange,
  projectedBalanceFromEntries,
} from '../src/domain/financial.js';
import { formatCents, parseMoneyToCents, parseSignedMoneyToCents } from '../src/domain/money.js';
import {
  isOverdue,
  localDateKey,
  localTodayDateOnly,
  resolvePeriod,
} from '../src/domain/periods.js';

const money = parseMoneyToCents;
const transfer = (amount: string, incoming: boolean) => ({ amount: money(amount), incoming });

describe('financial domain', () => {
  it('accepts only explicit decimal money formats and preserves cents', () => {
    for (const [input, expected] of [
      ['0', 0n],
      ['0,00', 0n],
      ['00,10', 10n],
      ['1', 100n],
      ['1,2', 120n],
      ['1.20', 120n],
      ['1234,56', 123456n],
      ['1234.56', 123456n],
    ] as const)
      expect(parseMoneyToCents(input)).toBe(expected);
    for (const input of [
      '-1',
      '+1',
      '1,234.56',
      '1.234,56',
      '1,2,3',
      'abc',
      'NaN',
      'Infinity',
      '',
      '  ',
    ])
      expect(() => parseMoneyToCents(input)).toThrow();
    expect(parseSignedMoneyToCents('-50,10')).toBe(-5010n);
    expect(formatCents(99999999n)).toBe('999999.99');
    expect(() => parseMoneyToCents('1000000000000.00')).toThrow();
  });

  it('calculates realized balance without counting transfers twice', () => {
    const sourceBalance = balanceFromEntries(
      money('1000'),
      [
        { amount: money('500'), type: 'INCOME', status: 'PAID' },
        { amount: money('200'), type: 'EXPENSE', status: 'PAID' },
      ],
      [transfer('300', false)],
    );
    const destinationBalance = balanceFromEntries(money('0'), [], [transfer('300', true)]);
    expect(sourceBalance + destinationBalance).toBe(money('1300'));
  });

  it('keeps pending and canceled entries out of realized balance', () => {
    expect(
      balanceFromEntries(
        money('10'),
        [
          { amount: money('20'), type: 'INCOME', status: 'PENDING' },
          { amount: money('4'), type: 'EXPENSE', status: 'CANCELED' },
        ],
        [],
      ),
    ).toBe(money('10'));
  });

  it('includes pending entries in projected balance', () => {
    expect(
      projectedBalanceFromEntries(
        money('1000'),
        [
          { amount: money('100'), type: 'INCOME', status: 'PENDING' },
          { amount: money('25.50'), type: 'EXPENSE', status: 'PENDING' },
        ],
        [],
      ),
    ).toBe(money('1074.50'));
  });

  it('preserves cent precision for small and large amounts', () => {
    expect(money('0.01') + money('0.10') + money('0.20')).toBe(31n);
    expect(money('999999.99')).toBe(99999999n);
    expect(
      Array.from({ length: 100 }, () => money('0.01')).reduce((sum, item) => sum + item, 0n),
    ).toBe(money('1.00'));
    expect(money('999999999999.99')).toBe(99999999999999n);
    expect(() => money('1000000000000.00')).toThrow();
  });

  it('does not produce infinity when the previous period is zero', () => {
    expect(percentageChange(money('12'), 0n)).toBeNull();
    expect(percentageChange(0n, 0n)).toBe(0);
  });

  it('uses local calendar boundaries across year and DST changes', () => {
    const tokyoNewYear = resolvePeriod('year', 'Asia/Tokyo', new Date('2025-12-31T16:00:00.000Z'));
    expect(tokyoNewYear.from.toISOString()).toBe('2025-12-31T15:00:00.000Z');
    const newYorkDst = resolvePeriod(
      'today',
      'America/New_York',
      new Date('2025-03-09T16:00:00.000Z'),
    );
    expect(newYorkDst.to.getTime() - newYorkDst.from.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(localDateKey(new Date('2026-01-01T02:30:00.000Z'), 'America/Sao_Paulo')).toBe(
      '2025-12-31',
    );
    expect(localTodayDateOnly('America/New_York', new Date('2026-01-01T04:30:00.000Z'))).toEqual(
      new Date('2025-12-31T00:00:00.000Z'),
    );
    expect(
      isOverdue(
        'PENDING',
        new Date('2026-01-01T00:00:00.000Z'),
        'America/Sao_Paulo',
        new Date('2026-01-01T05:00:00.000Z'),
      ),
    ).toBe(false);
    expect(
      isOverdue(
        'PENDING',
        new Date('2025-12-31T00:00:00.000Z'),
        'America/Sao_Paulo',
        new Date('2026-01-01T05:00:00.000Z'),
      ),
    ).toBe(true);
  });
});
