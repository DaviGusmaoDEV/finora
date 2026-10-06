import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl)
  throw new Error('CI exige TEST_DATABASE_URL para os testes de integração.');
const run = describe.skipIf(!databaseUrl);
const firstCookie = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.split(';')[0] || '';

run('motor financeiro e autorização (PostgreSQL real)', () => {
  let db: PrismaClient;
  let app: Awaited<ReturnType<typeof createApp>>;
  let aCookie = '';
  let bCookie = '';
  let aAccount = '';
  let bAccount = '';
  let aCategory = '';
  let aExpenseCategory = '';
  let bCategory = '';
  let aTransaction = '';

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: databaseUrl! } } });
    app = await createApp({ db });
    await db.transaction.deleteMany();
    await db.transfer.deleteMany();
    await db.session.deleteMany();
    await db.category.deleteMany();
    await db.account.deleteMany();
    await db.userPreference.deleteMany();
    await db.user.deleteMany();
    const a = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Financeiro A',
        email: 'financial-a@test.local',
        password: 'senha-segura-123',
      },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Financeiro B',
        email: 'financial-b@test.local',
        password: 'senha-segura-456',
      },
    });
    aCookie = firstCookie(a.headers['set-cookie']);
    bCookie = firstCookie(b.headers['set-cookie']);
    const accountA = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: aCookie },
      payload: { name: 'Conta A', type: 'CHECKING', initialBalance: '1000' },
    });
    const accountB = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: bCookie },
      payload: { name: 'Conta B', type: 'CHECKING', initialBalance: '1000' },
    });
    aAccount = accountA.json().id;
    bAccount = accountB.json().id;
    const categoryA = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: { cookie: aCookie },
      payload: { name: 'Salário', type: 'INCOME' },
    });
    const categoryB = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: { cookie: bCookie },
      payload: { name: 'Salário B', type: 'INCOME' },
    });
    aCategory = categoryA.json().id;
    const expenseCategory = await app.inject({
      method: 'POST',
      url: '/categories',
      headers: { cookie: aCookie },
      payload: { name: 'Despesas A', type: 'EXPENSE' },
    });
    aExpenseCategory = expenseCategory.json().id;
    bCategory = categoryB.json().id;
    const transaction = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { cookie: aCookie },
      payload: {
        accountId: aAccount,
        categoryId: aCategory,
        type: 'INCOME',
        status: 'PAID',
        description: 'Receita A',
        amount: '500.10',
        transactionDate: '2026-10-05T12:00:00.000Z',
      },
    });
    aTransaction = transaction.json().id;
  });
  afterAll(async () => {
    await app.close();
    await db.$disconnect();
  });

  it('mantém saldo consolidado neutro em transferência', async () => {
    const second = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: aCookie },
      payload: { name: 'Conta A2', type: 'SAVINGS', initialBalance: '0' },
    });
    const secondId = second.json().id;
    const transfer = await app.inject({
      method: 'POST',
      url: '/transfers',
      headers: { cookie: aCookie },
      payload: {
        sourceAccountId: aAccount,
        destinationAccountId: secondId,
        amount: '300.10',
        transferDate: '2026-10-05T12:00:00.000Z',
      },
    });
    expect(transfer.statusCode).toBe(201);
    const summary = await app.inject({
      method: 'GET',
      url: '/dashboard/summary?period=year',
      headers: { cookie: aCookie },
    });
    expect(summary.json().balance).toBe('1500.10');
  });

  it('impede IDOR em leitura, alteração e referências cruzadas', async () => {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/transactions/${aTransaction}`,
          headers: { cookie: bCookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/transactions/${aTransaction}/cancel`,
          headers: { cookie: bCookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/transactions/${aTransaction}`,
          headers: { cookie: bCookie },
          payload: { description: 'Invadida' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/transactions',
          headers: { cookie: bCookie },
          payload: {
            accountId: aAccount,
            categoryId: bCategory,
            type: 'INCOME',
            amount: '10.00',
            description: 'Cross account',
            transactionDate: '2026-10-05T12:00:00.000Z',
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/transfers',
          headers: { cookie: bCookie },
          payload: {
            sourceAccountId: bAccount,
            destinationAccountId: aAccount,
            amount: '10.00',
            transferDate: '2026-10-05T12:00:00.000Z',
          },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('persiste centavos exatos e substitui o efeito ao editar status e valor', async () => {
    const account = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: aCookie },
      payload: { name: 'Precisão A', type: 'CASH', initialBalance: '0' },
    });
    const accountId = account.json().id as string;
    const created = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { cookie: aCookie },
      payload: {
        accountId,
        categoryId: aExpenseCategory,
        type: 'EXPENSE',
        status: 'PAID',
        description: 'Centavo',
        amount: '0.01',
        transactionDate: '2026-10-05T12:00:00.000Z',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().amount).toBe('0.01');
    const id = created.json().id as string;
    const edited = await app.inject({
      method: 'PATCH',
      url: `/transactions/${id}`,
      headers: { cookie: aCookie },
      payload: { amount: '999999.99' },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().amount).toBe('999999.99');
    expect(
      (await app.inject({ method: 'GET', url: '/accounts', headers: { cookie: aCookie } }))
        .json()
        .find((item: { id: string }) => item.id === accountId).currentBalance,
    ).toBe('-999999.99');
    await app.inject({
      method: 'PATCH',
      url: `/transactions/${id}`,
      headers: { cookie: aCookie },
      payload: { status: 'PENDING' },
    });
    expect(
      (await app.inject({ method: 'GET', url: '/accounts', headers: { cookie: aCookie } }))
        .json()
        .find((item: { id: string }) => item.id === accountId).currentBalance,
    ).toBe('0.00');
    await app.inject({
      method: 'PATCH',
      url: `/transactions/${id}`,
      headers: { cookie: aCookie },
      payload: { status: 'PAID', amount: '0.10' },
    });
    expect(
      (await app.inject({ method: 'GET', url: '/accounts', headers: { cookie: aCookie } }))
        .json()
        .find((item: { id: string }) => item.id === accountId).currentBalance,
    ).toBe('-0.10');
  });

  it('cancela com efeito zero e deixa o estado imutável', async () => {
    const account = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { cookie: aCookie },
      payload: { name: 'Cancelamento A', type: 'CASH', initialBalance: '100' },
    });
    const accountId = account.json().id as string;
    const created = await app.inject({
      method: 'POST',
      url: '/transactions',
      headers: { cookie: aCookie },
      payload: {
        accountId,
        categoryId: aExpenseCategory,
        type: 'EXPENSE',
        status: 'PAID',
        description: 'Cancelável',
        amount: '50.00',
        transactionDate: '2026-10-05T12:00:00.000Z',
      },
    });
    const id = created.json().id as string;
    expect(
      (await app.inject({ method: 'GET', url: '/accounts', headers: { cookie: aCookie } }))
        .json()
        .find((item: { id: string }) => item.id === accountId).currentBalance,
    ).toBe('50.00');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/transactions/${id}/cancel`,
          headers: { cookie: aCookie },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/accounts', headers: { cookie: aCookie } }))
        .json()
        .find((item: { id: string }) => item.id === accountId).currentBalance,
    ).toBe('100.00');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/transactions/${id}/cancel`,
          headers: { cookie: aCookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/transactions/${id}`,
          headers: { cookie: aCookie },
          payload: { amount: '1.00' },
        })
      ).statusCode,
    ).toBe(409);
  });

  it('mantém os checks do PostgreSQL para transferência inválida', async () => {
    await expect(
      db.transfer.create({
        data: {
          userId: '00000000-0000-0000-0000-000000000000',
          sourceAccountId: aAccount,
          destinationAccountId: aAccount,
          amount: '0',
          transferDate: new Date('2026-10-05T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();
  });
});
