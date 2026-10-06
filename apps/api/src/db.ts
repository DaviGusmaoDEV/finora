import { PrismaClient } from '@prisma/client';

// O healthcheck e os testes unitários não precisam abrir uma conexão. A conexão real é criada
// normalmente fora do Vitest ou quando TEST_DATABASE_URL é fornecida para os testes de integração.
export const prisma =
  process.env.VITEST && !process.env.TEST_DATABASE_URL
    ? (undefined as unknown as PrismaClient)
    : new PrismaClient();
