import type { FastifyInstance } from 'fastify';
import argon2 from 'argon2';
import { loginSchema, registerSchema } from '../schemas.js';
import { createSession, revokeSession } from './session.js';
import type { AppContext } from '../app.js';

export async function registerAuthRoutes(app: FastifyInstance, context: AppContext) {
  app.post(
    '/auth/register',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Revise os dados informados.',
            fields: parsed.error.flatten().fieldErrors,
          },
        });
      const { name, email, password } = parsed.data;
      const existing = await context.db.user.findUnique({ where: { email }, select: { id: true } });
      if (existing)
        return reply.code(409).send({
          error: {
            code: 'ACCOUNT_UNAVAILABLE',
            message: 'Não foi possível criar a conta com esses dados.',
          },
        });
      const user = await context.db.user.create({
        data: {
          name,
          email,
          passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
          preference: { create: {} },
        },
        select: { id: true, name: true, email: true, preference: true },
      });
      await createSession(context.db, reply, user.id, context.cookieName, context.isProduction);
      return reply.code(201).send({
        user: { id: user.id, name: user.name, email: user.email },
        preference: user.preference,
      });
    },
  );

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'Revise os dados informados.' } });
      const user = await context.db.user.findUnique({
        where: { email: parsed.data.email },
        include: { preference: true },
      });
      const valid = user ? await argon2.verify(user.passwordHash, parsed.data.password) : false;
      if (!user || !valid)
        return reply
          .code(401)
          .send({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } });
      await createSession(context.db, reply, user.id, context.cookieName, context.isProduction);
      return {
        user: { id: user.id, name: user.name, email: user.email },
        preference: user.preference,
      };
    },
  );

  app.post('/auth/logout', async (request, reply) => {
    await revokeSession(context.db, request, reply, context.cookieName);
    return { ok: true };
  });
  app.get('/auth/me', async (request, reply) => {
    if (!request.userId)
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHENTICATED', message: 'Sessão necessária.' } });
    const user = await context.db.user.findUnique({
      where: { id: request.userId },
      select: { id: true, name: true, email: true, preference: true },
    });
    if (!user)
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHENTICATED', message: 'Sessão necessária.' } });
    return { user, preference: user.preference };
  });
}
