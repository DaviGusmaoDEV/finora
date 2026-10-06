import { describe, expect, it } from 'vitest';
import { moneySchema } from '../src';

describe('shared validation', () => {
  it('accepts finite non-negative amounts', () => {
    expect(moneySchema.parse(100.5)).toBe(100.5);
  });

  it('rejects negative amounts', () => {
    expect(() => moneySchema.parse(-1)).toThrow();
  });
});
