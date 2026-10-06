# Estratégia de testes

O projeto usa uma pirâmide curta e explícita:

- **Unit/domain:** regras de dinheiro, saldo, períodos, timezone, parser e validações, sem banco.
- **Integration:** Fastify + Prisma + PostgreSQL real, cobrindo autenticação, isolamento, transações, transferências, dashboard, IDOR e constraints.
- **E2E:** navegador Playwright contra API e frontend reais, com PostgreSQL real, cobrindo cadastro, onboarding e fluxos financeiros.

## Local sem PostgreSQL

```bash
npm ci
npm run db:generate
DATABASE_URL='postgresql://ci_user:ci_password@localhost:5432/finance_test' \
  npx prisma validate --schema packages/db/prisma/schema.prisma
npm run lint
npm run typecheck
npm run format:check
npm run test
npm run build
```

Sem `TEST_DATABASE_URL`, os testes de integração ficam explicitamente skipped localmente. Com `CI=true`, a ausência dessa variável faz a suíte falhar, evitando falso positivo.

## Local com PostgreSQL

Use exclusivamente um banco local de teste/desenvolvimento, nunca produção:

```bash
docker compose up -d
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/finance_app'
export TEST_DATABASE_URL="$DATABASE_URL"
export E2E_DATABASE_URL="$DATABASE_URL"
npm run db:generate
npx prisma validate --schema packages/db/prisma/schema.prisma
npm run db:migrate
DEMO_PASSWORD='somente-local' npm run db:seed
npm run test:integration --workspace=@finance/api
npx playwright install chromium
npm run test:e2e
```

As suítes de integração limpam seus dados no `beforeAll`. A suíte E2E gera usuários com e-mails únicos. No CI, integração e E2E usam jobs e bancos PostgreSQL separados, ambos criados vazios e migrados com `prisma migrate deploy`.

O seed demo exige `DEMO_PASSWORD`, não usa dados externos, não roda automaticamente em produção e pode ser executado novamente sem duplicar a conta/categorias demo.

## GitHub Actions

`.github/workflows/ci.yml` possui três jobs:

1. `Quality and unit tests`: generate, validate, lint, typecheck, format, unit/domain tests e build.
2. `PostgreSQL migrations, seed and integration`: service PostgreSQL 16 novo, migrations, seed e todos os testes de integração com `TEST_DATABASE_URL`.
3. `PostgreSQL authenticated E2E`: outro service PostgreSQL 16 novo, migrations, seed, instalação do Chromium e E2E autenticado com `E2E_DATABASE_URL`.

O E2E coleta screenshot, trace, vídeo e relatório HTML somente quando houver falha; o workflow retém os artefatos por cinco dias. Nenhum estado de banco, `.env`, sessão ou segredo é cacheado.
