import { describe, expect, it } from 'vitest';
import { preferenceSchema, transferSchema } from '../src/schemas.js';

const validTransfer = {
  sourceAccountId: '00000000-0000-0000-0000-000000000001',
  destinationAccountId: '00000000-0000-0000-0000-000000000002',
  transferDate: '2026-10-06T12:00:00.000Z',
};

describe('financial request schemas', () => {
  it('rejects zero transfer amounts before reaching PostgreSQL', () => {
    expect(transferSchema.safeParse({ ...validTransfer, amount: '0,00' }).success).toBe(false);
    expect(transferSchema.safeParse({ ...validTransfer, amount: '0' }).success).toBe(false);
    expect(transferSchema.safeParse({ ...validTransfer, amount: '0.01' }).success).toBe(true);
  });

  it('rejects invalid IANA timezones instead of deferring to a runtime error', () => {
    expect(preferenceSchema.safeParse({ timezone: 'Not/A-Timezone' }).success).toBe(false);
    expect(preferenceSchema.safeParse({ timezone: 'America/New_York' }).success).toBe(true);
  });
});
