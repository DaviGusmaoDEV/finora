import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('API foundation', () => {
  it('exposes a health endpoint', async () => {
    const response = await (await createApp()).inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'finance-api' });
  });
});
