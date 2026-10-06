import type { FastifyInstance } from 'fastify';
import { accountSchema, categorySchema, preferenceSchema, profileSchema } from '../schemas.js';
import type { AppContext } from '../app.js';
import { balanceFromEntries } from '../domain/financial.js';
import { formatCents, parseMoneyToCents, parseSignedMoneyToCents } from '../domain/money.js';

function requireUser(
  request: { userId: string | null },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) {
  if (!request.userId)
    return reply
      .code(401)
      .send({ error: { code: 'UNAUTHENTICATED', message: 'Sessão necessária.' } });
  return null;
}
const publicUser = { id: true, name: true, email: true, preference: true } as const;

export async function registerPrivateRoutes(app: FastifyInstance, context: AppContext) {
  app.get('/preferences', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    return context.db.userPreference.findUnique({ where: { userId: request.userId! } });
  });
  app.patch('/preferences', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = preferenceSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Preferências inválidas.',
          fields: parsed.error.flatten().fieldErrors,
        },
      });
    return context.db.userPreference.update({
      where: { userId: request.userId! },
      data: parsed.data,
    });
  });

  app.get('/accounts', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const accounts = await context.db.account.findMany({
      where: { userId: request.userId!, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      accounts.map(async (account) => {
        const now = new Date();
        const [transactions, outgoing, incoming] = await Promise.all([
          context.db.transaction.findMany({
            where: { accountId: account.id, userId: request.userId! },
            select: { amount: true, type: true, status: true },
          }),
          context.db.transfer.findMany({
            where: {
              sourceAccountId: account.id,
              userId: request.userId!,
              transferDate: { lte: now },
            },
            select: { amount: true },
          }),
          context.db.transfer.findMany({
            where: {
              destinationAccountId: account.id,
              userId: request.userId!,
              transferDate: { lte: now },
            },
            select: { amount: true },
          }),
        ]);
        const balance = balanceFromEntries(
          parseMoneyToCents(String(account.initialBalance)),
          transactions.map((item) => ({
            amount: parseMoneyToCents(String(item.amount)),
            type: item.type,
            status: item.status,
          })),
          [
            ...outgoing.map((item) => ({
              amount: parseMoneyToCents(String(item.amount)),
              incoming: false,
            })),
            ...incoming.map((item) => ({
              amount: parseMoneyToCents(String(item.amount)),
              incoming: true,
            })),
          ],
        );
        return {
          ...account,
          initialBalance: String(account.initialBalance),
          currentBalance: formatCents(balance),
        };
      }),
    );
  });
  app.post('/accounts', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = accountSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados da conta inválidos.',
          fields: parsed.error.flatten().fieldErrors,
        },
      });
    const account = await context.db.account.create({
      data: {
        ...parsed.data,
        userId: request.userId!,
        initialBalance: formatCents(parseSignedMoneyToCents(parsed.data.initialBalance)),
      },
    });
    return reply.code(201).send(account);
  });
  app.patch('/accounts/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = accountSchema.partial().safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Dados da conta inválidos.' } });
    const result = await context.db.account.updateMany({
      where: { id: (request.params as { id: string }).id, userId: request.userId!, isActive: true },
      data: {
        ...parsed.data,
        initialBalance:
          parsed.data.initialBalance === undefined
            ? undefined
            : formatCents(parseSignedMoneyToCents(parsed.data.initialBalance)),
      },
    });
    if (!result.count)
      return reply
        .code(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Conta não encontrada.' } });
    return context.db.account.findFirst({
      where: { id: (request.params as { id: string }).id, userId: request.userId! },
    });
  });
  app.delete('/accounts/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const result = await context.db.account.updateMany({
      where: { id: (request.params as { id: string }).id, userId: request.userId!, isActive: true },
      data: { isActive: false },
    });
    if (!result.count)
      return reply
        .code(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Conta não encontrada.' } });
    return { ok: true };
  });

  app.get('/categories', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    return context.db.category.findMany({
      where: { userId: request.userId!, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  });
  app.post('/categories', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Dados da categoria inválidos.' } });
    if (parsed.data.parentId) {
      const parent = await context.db.category.findFirst({
        where: { id: parsed.data.parentId, userId: request.userId!, isActive: true },
      });
      if (!parent || parent.type !== parsed.data.type || parent.parentId)
        return reply
          .code(400)
          .send({ error: { code: 'INVALID_PARENT', message: 'Subcategoria inválida.' } });
    }
    return reply
      .code(201)
      .send(
        await context.db.category.create({ data: { ...parsed.data, userId: request.userId! } }),
      );
  });
  app.patch('/categories/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const id = (request.params as { id: string }).id;
    const parsed = categorySchema.partial().safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Dados da categoria inválidos.' } });
    if (parsed.data.parentId) {
      const parent = await context.db.category.findFirst({
        where: { id: parsed.data.parentId, userId: request.userId!, isActive: true },
      });
      if (
        !parent ||
        parent.parentId ||
        parent.id === id ||
        (parsed.data.type && parent.type !== parsed.data.type)
      )
        return reply
          .code(400)
          .send({ error: { code: 'INVALID_PARENT', message: 'Subcategoria inválida.' } });
    }
    const result = await context.db.category.updateMany({
      where: { id, userId: request.userId!, isActive: true },
      data: parsed.data,
    });
    if (!result.count)
      return reply
        .code(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Categoria não encontrada.' } });
    return context.db.category.findFirst({
      where: { id, userId: request.userId! },
    });
  });
  app.delete('/categories/:id', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const result = await context.db.category.updateMany({
      where: { id: (request.params as { id: string }).id, userId: request.userId!, isActive: true },
      data: { isActive: false },
    });
    if (!result.count)
      return reply
        .code(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Categoria não encontrada.' } });
    return { ok: true };
  });

  app.patch('/profile', async (request, reply) => {
    const denied = requireUser(request, reply);
    if (denied) return denied;
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Nome inválido.' } });
    return context.db.user.update({
      where: { id: request.userId! },
      data: parsed.data,
      select: publicUser,
    });
  });
}
