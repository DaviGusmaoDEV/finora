import type { FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  dashboardQuerySchema,
  transactionQuerySchema,
  transactionSchema,
  transactionUpdateSchema,
  transferSchema,
} from '../schemas.js';
import {
  balanceFromEntries,
  percentageChange,
  projectedBalanceFromEntries,
} from '../domain/financial.js';
import { formatCents, parseMoneyToCents } from '../domain/money.js';
import { isOverdue, localDateKey, localTodayDateOnly, resolvePeriod } from '../domain/periods.js';
import type { AppContext } from '../app.js';

type Reply = { code: (status: number) => { send: (body: unknown) => unknown } };
function requireUser(request: { userId: string | null }, reply: Reply) {
  if (!request.userId)
    return reply
      .code(401)
      .send({ error: { code: 'UNAUTHENTICATED', message: 'Sessão necessária.' } });
  return null;
}
function error(reply: Reply, code: string, message: string, status = 400) {
  return reply.code(status).send({ error: { code, message } });
}
function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function isoDate(value: string) {
  return new Date(value);
}
function money(value: string) {
  return parseMoneyToCents(value);
}

async function validateReferences(
  db: PrismaClient,
  userId: string,
  accountId: string,
  categoryId: string,
  type: 'INCOME' | 'EXPENSE',
) {
  const [account, category] = await Promise.all([
    db.account.findFirst({ where: { id: accountId, userId, isActive: true } }),
    db.category.findFirst({ where: { id: categoryId, userId, isActive: true } }),
  ]);
  if (!account) return 'Conta não encontrada.';
  if (!category || category.type !== type) return 'Categoria incompatível ou não encontrada.';
  return null;
}

function serializeTransaction(item: {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: string;
  status: string;
  description: string;
  amount: unknown;
  transactionDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  notes: string | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  account?: { name: string };
  category?: { name: string };
}) {
  return { ...item, amount: String(item.amount), account: item.account, category: item.category };
}

export async function registerFinancialRoutes(app: FastifyInstance, context: AppContext) {
  app.get('/activity', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = transactionQuerySchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Filtros inválidos.');
    const { page, limit, sort, from, to, period, type, status, accountId, categoryId, search } =
      parsed.data;
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
      select: { timezone: true },
    });
    const range =
      !from && !to && period
        ? resolvePeriod(period, preference?.timezone ?? 'America/Sao_Paulo')
        : null;
    const start = from ? dateOnly(from) : range?.from;
    const end = to ? dateOnly(to) : range?.to;
    const transactionWhere: Prisma.Sql[] = [Prisma.sql`t.user_id = ${request.userId!}`];
    const transferWhere: Prisma.Sql[] = [Prisma.sql`tr.user_id = ${request.userId!}`];
    if (start) {
      transactionWhere.push(Prisma.sql`t.transaction_date >= ${start}`);
      transferWhere.push(Prisma.sql`tr.transfer_date >= ${start}`);
    }
    if (end) {
      transactionWhere.push(Prisma.sql`t.transaction_date < ${end}`);
      transferWhere.push(Prisma.sql`tr.transfer_date < ${end}`);
    }
    if (type) transactionWhere.push(Prisma.sql`t.type = ${type}::"TransactionType"`);
    if (status) {
      transactionWhere.push(Prisma.sql`t.status = ${status}::"TransactionStatus"`);
      transferWhere.push(Prisma.sql`FALSE`);
    }
    if (accountId) {
      transactionWhere.push(Prisma.sql`t.account_id = ${accountId}::uuid`);
      transferWhere.push(
        Prisma.sql`(tr.source_account_id = ${accountId}::uuid OR tr.destination_account_id = ${accountId}::uuid)`,
      );
    }
    if (categoryId) {
      transactionWhere.push(Prisma.sql`t.category_id = ${categoryId}::uuid`);
      transferWhere.push(Prisma.sql`FALSE`);
    }
    if (type) transferWhere.push(Prisma.sql`FALSE`);
    if (search) {
      transactionWhere.push(
        Prisma.sql`(t.description ILIKE ${`%${search}%`} OR COALESCE(t.notes, '') ILIKE ${`%${search}%`})`,
      );
      transferWhere.push(
        Prisma.sql`(COALESCE(tr.description, '') ILIKE ${`%${search}%`} OR COALESCE(tr.notes, '') ILIKE ${`%${search}%`})`,
      );
    }
    const transactionSql = Prisma.sql`SELECT t.id::text AS id, 'TRANSACTION'::text AS kind, t.transaction_date AS event_date, t.description, t.amount::text AS amount, t.type::text AS type, t.status::text AS status, t.account_id::text AS account_id, t.category_id::text AS category_id, a.name AS account_name, c.name AS category_name, NULL::text AS source_account_id, NULL::text AS destination_account_id, NULL::text AS source_account_name, NULL::text AS destination_account_name FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN categories c ON c.id = t.category_id WHERE ${Prisma.join(transactionWhere, ' AND ')}`;
    const transferSql = Prisma.sql`SELECT tr.id::text AS id, 'TRANSFER'::text AS kind, tr.transfer_date AS event_date, COALESCE(tr.description, 'Transferência') AS description, tr.amount::text AS amount, NULL::text AS type, 'TRANSFER'::text AS status, NULL::text AS account_id, NULL::text AS category_id, destination.name AS account_name, NULL::text AS category_name, tr.source_account_id::text AS source_account_id, tr.destination_account_id::text AS destination_account_id, source.name AS source_account_name, destination.name AS destination_account_name FROM transfers tr JOIN accounts source ON source.id = tr.source_account_id JOIN accounts destination ON destination.id = tr.destination_account_id WHERE ${Prisma.join(transferWhere, ' AND ')}`;
    const union = Prisma.sql`${transactionSql} UNION ALL ${transferSql}`;
    const order =
      sort === 'highest'
        ? Prisma.sql`amount DESC, event_date DESC, id ASC`
        : sort === 'lowest'
          ? Prisma.sql`amount ASC, event_date DESC, id ASC`
          : sort === 'oldest'
            ? Prisma.sql`event_date ASC, id ASC`
            : Prisma.sql`event_date DESC, id ASC`;
    const [items, countRows] = await Promise.all([
      context.db.$queryRaw<
        Array<{
          id: string;
          kind: string;
          event_date: Date;
          description: string;
          amount: string;
          type: string | null;
          status: string;
          account_id: string | null;
          category_id: string | null;
          account_name: string;
          category_name: string | null;
          source_account_id: string | null;
          destination_account_id: string | null;
          source_account_name: string | null;
          destination_account_name: string | null;
        }>
      >(
        Prisma.sql`SELECT * FROM (${union}) feed ORDER BY ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      ),
      context.db.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM (${union}) feed`,
      ),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        transactionDate: item.event_date,
        description: item.description,
        amount: item.amount,
        type: item.type,
        status: item.status,
        accountId: item.account_id,
        categoryId: item.category_id,
        account: item.account_name ? { name: item.account_name } : null,
        category: item.category_name ? { name: item.category_name } : null,
        sourceAccountId: item.source_account_id,
        destinationAccountId: item.destination_account_id,
        sourceAccount: item.source_account_name ? { name: item.source_account_name } : null,
        destinationAccount: item.destination_account_name
          ? { name: item.destination_account_name }
          : null,
      })),
      pagination: {
        page,
        limit,
        total: Number(countRows[0]?.count ?? 0n),
        totalPages: Math.ceil(Number(countRows[0]?.count ?? 0n) / limit),
      },
    };
  });

  app.get('/transactions', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = transactionQuerySchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Filtros inválidos.');
    const { page, limit, sort, from, to, period, ...filters } = parsed.data;
    const where: Prisma.TransactionWhereInput = { userId: request.userId! };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.search)
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    if (from || to)
      where.transactionDate = {
        ...(from ? { gte: dateOnly(from) } : {}),
        ...(to ? { lt: dateOnly(to) } : {}),
      };
    else if (period) {
      const preference = await context.db.userPreference.findUnique({
        where: { userId: request.userId! },
        select: { timezone: true },
      });
      const range = resolvePeriod(period, preference?.timezone ?? 'America/Sao_Paulo');
      where.transactionDate = { gte: range.from, lt: range.to };
    }
    const primaryOrder: Prisma.TransactionOrderByWithRelationInput =
      sort === 'highest'
        ? { amount: 'desc' }
        : sort === 'lowest'
          ? { amount: 'asc' }
          : { transactionDate: sort === 'oldest' ? 'asc' : 'desc' };
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [
      primaryOrder,
      { createdAt: 'desc' },
      { id: 'asc' },
    ];
    const [items, total] = await Promise.all([
      context.db.transaction.findMany({
        where,
        include: { account: { select: { name: true } }, category: { select: { name: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      context.db.transaction.count({ where }),
    ]);
    return {
      items: items.map(serializeTransaction),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.get('/transactions/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const id = (request.params as { id: string }).id;
    const item = await context.db.transaction.findFirst({
      where: { id, userId: request.userId! },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    });
    if (!item) return error(reply, 'NOT_FOUND', 'Lançamento não encontrado.', 404);
    return serializeTransaction(item);
  });

  app.post('/transactions', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = transactionSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Dados do lançamento inválidos.');
    const input = parsed.data;
    const referenceError = await validateReferences(
      context.db,
      request.userId!,
      input.accountId,
      input.categoryId,
      input.type,
    );
    if (referenceError) return error(reply, 'INVALID_REFERENCE', referenceError);
    const status = input.status;
    const item = await context.db.transaction.create({
      data: {
        userId: request.userId!,
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type,
        status,
        description: input.description,
        amount: formatCents(money(input.amount)),
        transactionDate: isoDate(input.transactionDate),
        dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
        paidAt: status === 'PAID' ? isoDate(input.paidAt ?? input.transactionDate) : null,
        notes: input.notes ?? null,
        canceledAt: status === 'CANCELED' ? new Date() : null,
      },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    });
    return reply.code(201).send(serializeTransaction(item));
  });

  app.patch('/transactions/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const id = (request.params as { id: string }).id;
    const parsed = transactionUpdateSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Dados do lançamento inválidos.');
    const current = await context.db.transaction.findFirst({
      where: { id, userId: request.userId! },
    });
    if (!current) return error(reply, 'NOT_FOUND', 'Lançamento não encontrado.', 404);
    if (current.status === 'CANCELED')
      return error(reply, 'CANCELED_IMMUTABLE', 'Lançamento cancelado não pode ser editado.', 409);
    const input = parsed.data;
    if (input.accountId || input.categoryId || input.type) {
      const referenceError = await validateReferences(
        context.db,
        request.userId!,
        input.accountId ?? current.accountId,
        input.categoryId ?? current.categoryId,
        input.type ?? current.type,
      );
      if (referenceError) return error(reply, 'INVALID_REFERENCE', referenceError);
    }
    const status = input.status ?? current.status;
    const item = await context.db.transaction.update({
      where: { id },
      data: {
        ...(input.accountId ? { accountId: input.accountId } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.amount ? { amount: formatCents(money(input.amount)) } : {}),
        ...(input.transactionDate ? { transactionDate: isoDate(input.transactionDate) } : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: input.dueDate ? dateOnly(input.dueDate) : null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        status,
        paidAt:
          status === 'PAID'
            ? isoDate(
                input.paidAt ?? input.transactionDate ?? current.transactionDate.toISOString(),
              )
            : null,
        canceledAt: status === 'CANCELED' ? (current.canceledAt ?? new Date()) : null,
      },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    });
    return serializeTransaction(item);
  });

  app.post('/transactions/:id/cancel', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const id = (request.params as { id: string }).id;
    const result = await context.db.transaction.updateMany({
      where: { id, userId: request.userId!, status: { not: 'CANCELED' } },
      data: { status: 'CANCELED', canceledAt: new Date(), paidAt: null },
    });
    if (!result.count) return error(reply, 'NOT_FOUND', 'Lançamento não encontrado.', 404);
    return { ok: true };
  });

  app.get('/transfers', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = dashboardQuerySchema.partial().safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Filtros inválidos.');
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
      select: { timezone: true },
    });
    const range = parsed.data.period
      ? resolvePeriod(parsed.data.period, preference?.timezone ?? 'America/Sao_Paulo')
      : null;
    const items = await context.db.transfer.findMany({
      where: {
        userId: request.userId!,
        ...(range ? { transferDate: { gte: range.from, lt: range.to } } : {}),
      },
      include: {
        sourceAccount: { select: { name: true } },
        destinationAccount: { select: { name: true } },
      },
      orderBy: { transferDate: 'desc' },
      take: 100,
    });
    return items.map((item) => ({ ...item, amount: String(item.amount), kind: 'TRANSFER' }));
  });

  app.post('/transfers', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = transferSchema.safeParse(request.body);
    if (!parsed.success)
      return error(reply, 'VALIDATION_ERROR', 'Dados da transferência inválidos.');
    const input = parsed.data;
    if (input.sourceAccountId === input.destinationAccountId)
      return error(reply, 'SAME_ACCOUNT', 'Escolha contas diferentes.');
    const accounts = await context.db.account.findMany({
      where: {
        id: { in: [input.sourceAccountId, input.destinationAccountId] },
        userId: request.userId!,
        isActive: true,
      },
    });
    if (accounts.length !== 2)
      return error(
        reply,
        'INVALID_REFERENCE',
        'As duas contas devem pertencer ao usuário e estar ativas.',
      );
    const item = await context.db.$transaction((tx) =>
      tx.transfer.create({
        data: {
          userId: request.userId!,
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: input.destinationAccountId,
          amount: formatCents(money(input.amount)),
          transferDate: isoDate(input.transferDate),
          description: input.description ?? null,
          notes: input.notes ?? null,
        },
        include: {
          sourceAccount: { select: { name: true } },
          destinationAccount: { select: { name: true } },
        },
      }),
    );
    return reply.code(201).send({ ...item, amount: String(item.amount), kind: 'TRANSFER' });
  });

  app.get('/dashboard/summary', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = dashboardQuerySchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Período inválido.');
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
    });
    const range = resolvePeriod(parsed.data.period, preference?.timezone ?? 'America/Sao_Paulo');
    const [accounts, transactions, transfers] = await Promise.all([
      context.db.account.findMany({ where: { userId: request.userId!, isActive: true } }),
      context.db.transaction.findMany({ where: { userId: request.userId! } }),
      context.db.transfer.findMany({ where: { userId: request.userId! } }),
    ]);
    const transactionEntries = transactions.map((item) => ({
      ...item,
      amount: money(String(item.amount)),
    }));
    const now = new Date();
    const realizedTransfers = transfers.filter((item) => item.transferDate <= now);
    const balance = accounts.reduce((total, account) => {
      const ownTransactions = transactionEntries.filter((item) => item.accountId === account.id);
      const ownTransfers = realizedTransfers
        .filter(
          (item) => item.sourceAccountId === account.id || item.destinationAccountId === account.id,
        )
        .map((item) => ({
          amount: money(String(item.amount)),
          incoming: item.destinationAccountId === account.id,
        }));
      return (
        total +
        balanceFromEntries(money(String(account.initialBalance)), ownTransactions, ownTransfers)
      );
    }, 0n);
    const projected = accounts.reduce((total, account) => {
      const ownTransactions = transactionEntries.filter(
        (item) => item.accountId === account.id && item.status !== 'CANCELED',
      );
      const ownTransfers = transfers
        .filter(
          (item) => item.sourceAccountId === account.id || item.destinationAccountId === account.id,
        )
        .map((item) => ({
          amount: money(String(item.amount)),
          incoming: item.destinationAccountId === account.id,
        }));
      return (
        total +
        projectedBalanceFromEntries(
          money(String(account.initialBalance)),
          ownTransactions,
          ownTransfers,
        )
      );
    }, 0n);
    const periodItems = transactionEntries.filter(
      (item) =>
        item.transactionDate >= range.from &&
        item.transactionDate < range.to &&
        item.status === 'PAID',
    );
    const previousItems = transactionEntries.filter(
      (item) =>
        item.transactionDate >= range.previousFrom &&
        item.transactionDate < range.previousTo &&
        item.status === 'PAID',
    );
    const sumType = (items: typeof periodItems, type: 'INCOME' | 'EXPENSE') =>
      items.filter((item) => item.type === type).reduce((total, item) => total + item.amount, 0n);
    const income = sumType(periodItems, 'INCOME');
    const expense = sumType(periodItems, 'EXPENSE');
    const previousIncome = sumType(previousItems, 'INCOME');
    const previousExpense = sumType(previousItems, 'EXPENSE');
    return {
      period: parsed.data.period,
      balance: formatCents(balance),
      projectedBalance: formatCents(projected),
      income: formatCents(income),
      expense: formatCents(expense),
      result: formatCents(income - expense),
      comparison: {
        income: percentageChange(income, previousIncome),
        expense: percentageChange(expense, previousExpense),
        result: percentageChange(income - expense, previousIncome - previousExpense),
      },
      pending: formatCents(
        transactionEntries
          .filter((item) => item.status === 'PENDING')
          .reduce(
            (total, item) => total + (item.type === 'INCOME' ? item.amount : item.amount),
            0n,
          ),
      ),
      transferCount: transfers.length,
    };
  });

  app.get('/dashboard/categories', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = dashboardQuerySchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Período inválido.');
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
    });
    const range = resolvePeriod(parsed.data.period, preference?.timezone ?? 'America/Sao_Paulo');
    const items = await context.db.transaction.findMany({
      where: {
        userId: request.userId!,
        type: 'EXPENSE',
        status: 'PAID',
        transactionDate: { gte: range.from, lt: range.to },
      },
      include: { category: { select: { name: true } } },
    });
    const totals = new Map<string, { name: string; amount: bigint }>();
    for (const item of items) {
      const key = item.categoryId;
      const current = totals.get(key) ?? { name: item.category.name, amount: 0n };
      current.amount += money(String(item.amount));
      totals.set(key, current);
    }
    const total = [...totals.values()].reduce((sum, item) => sum + item.amount, 0n);
    return [...totals.values()]
      .sort((a, b) => (a.amount > b.amount ? -1 : 1))
      .map((item) => ({
        ...item,
        amount: formatCents(item.amount),
        percent: total ? Number((item.amount * 10000n) / total) / 100 : 0,
      }));
  });

  app.get('/dashboard/cash-flow', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = dashboardQuerySchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 'VALIDATION_ERROR', 'Período inválido.');
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
      select: { timezone: true },
    });
    const range = resolvePeriod(parsed.data.period, preference?.timezone ?? 'America/Sao_Paulo');
    const timezone = preference?.timezone ?? 'America/Sao_Paulo';
    const items = await context.db.transaction.findMany({
      where: {
        userId: request.userId!,
        status: 'PAID',
        transactionDate: { gte: range.from, lt: range.to },
      },
      select: { type: true, amount: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' },
    });
    const grouped = new Map<string, { income: bigint; expense: bigint }>();
    for (const item of items) {
      const key = localDateKey(item.transactionDate, timezone);
      const current = grouped.get(key) ?? { income: 0n, expense: 0n };
      current[item.type === 'INCOME' ? 'income' : 'expense'] += money(String(item.amount));
      grouped.set(key, current);
    }
    return [...grouped.entries()].map(([date, values]) => ({
      date,
      income: formatCents(values.income),
      expense: formatCents(values.expense),
    }));
  });

  app.get('/dashboard/upcoming', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const preference = await context.db.userPreference.findUnique({
      where: { userId: request.userId! },
      select: { timezone: true },
    });
    const timezone = preference?.timezone ?? 'America/Sao_Paulo';
    const now = new Date();
    const today = localTodayDateOnly(timezone, now);
    const next = new Date(today);
    next.setUTCDate(next.getUTCDate() + 30);
    const items = await context.db.transaction.findMany({
      where: {
        userId: request.userId!,
        type: 'EXPENSE',
        status: 'PENDING',
        dueDate: { lte: next },
      },
      include: { category: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
    return items.map((item) => ({
      ...serializeTransaction(item),
      overdue: isOverdue(item.status, item.dueDate, timezone, now),
    }));
  });
}
