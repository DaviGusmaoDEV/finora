import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import { prisma } from './db.js';
import { getSessionUserId } from './auth/session.js';
import { registerAuthRoutes } from './auth/routes.js';
import { registerPrivateRoutes } from './routes/private.js';
import { registerFinancialRoutes } from './routes/financial.js';

export type AppContext = {
  db: PrismaClient;
  cookieName: string;
  isProduction: boolean;
  webOrigin: string;
};

export async function createApp(contextOverrides?: Partial<AppContext>): Promise<FastifyInstance> {
  const context: AppContext = {
    db: prisma,
    cookieName: 'finora_session',
    isProduction: false,
    webOrigin: 'http://localhost:5173',
    ...contextOverrides,
  };
  const app = Fastify({ logger: false });
  await app.register(cookie);
  await app.register(cors, { origin: context.webOrigin, credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.decorateRequest('userId', null);
  app.addHook('onRequest', async (request) => {
    if (request.url === '/health') {
      request.userId = null;
      return;
    }
    request.userId = await getSessionUserId(context.db, request, context.cookieName);
  });
  app.addHook('onRequest', async (request, reply) => {
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
      request.headers.origin &&
      request.headers.origin !== context.webOrigin
    )
      return reply
        .code(403)
        .send({ error: { code: 'ORIGIN_FORBIDDEN', message: 'Origem não permitida.' } });
  });
  app.get('/health', async () => ({ status: 'ok', service: 'finance-api' }));
  await registerAuthRoutes(app, context);
  await registerPrivateRoutes(app, context);
  await registerFinancialRoutes(app, context);
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' } });
  });
  return app;
}
