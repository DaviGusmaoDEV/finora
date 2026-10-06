import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl)
  throw new Error('CI exige TEST_DATABASE_URL para os testes de integração.');
const run = describe.skipIf(!databaseUrl);
const firstCookie = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.split(';')[0] || '';

run('isolamento de dados entre usuários (PostgreSQL real)', () => {
  let db: PrismaClient;
  let app: Awaited<ReturnType<typeof createApp>>;
  let userACookie = '';
  let userBAccountId = '';

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: databaseUrl! } } });
    app = await createApp({ db });
    await db.session.deleteMany();
    await db.transaction.deleteMany();
    await db.transfer.deleteMany();
    await db.category.deleteMany();
    await db.account.deleteMany();
    await db.userPreference.deleteMany();
    await db.user.deleteMany();
    const a = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Usuário A', email: 'a@test.local', password: 'senha-segura-123' },
    });
    userACookie = firstCookie(a.headers['set-cookie']);
    await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: userACookie },
      payload: { name: 'Conta A', type: 'CHECKING', initialBalance: '100' },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Usuário B', email: 'b@test.local', password: 'senha-segura-456' },
    });
    const bCookie = firstCookie(b.headers['set-cookie']);
    const bAccount = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: bCookie },
      payload: { name: 'Conta B', type: 'CASH', initialBalance: '200' },
    });
    userBAccountId = bAccount.json().id;
  });
  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  it('retorna somente recursos do usuário autenticado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/accounts',
      headers: { cookie: userACookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().every((account: { name: string }) => account.name !== 'Conta B')).toBe(
      true,
    );
  });

  it('rejeita alteração de recurso de outro usuário', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/accounts/${userBAccountId}`,
      headers: { cookie: userACookie },
      payload: { name: 'Acesso indevido' },
    });
    expect(response.statusCode).toBe(404);
  });
});
