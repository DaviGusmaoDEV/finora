import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: PrismaClient,
  reply: FastifyReply,
  userId: string,
  cookieName: string,
  isProduction: boolean,
) {
  const token = randomBytes(32).toString('base64url');
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  reply.setCookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function revokeSession(
  db: PrismaClient,
  request: FastifyRequest,
  reply: FastifyReply,
  cookieName: string,
) {
  const token = request.cookies[cookieName];
  if (token)
    await db.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  reply.clearCookie(cookieName, { path: '/' });
}

export async function getSessionUserId(
  db: PrismaClient,
  request: FastifyRequest,
  cookieName: string,
) {
  const token = request.cookies[cookieName];
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  return session?.userId ?? null;
}
