# Finora

Finora é uma base profissional para uma futura aplicação de gestão financeira pessoal. O objetivo é
acompanhar a evolução do projeto desde uma fundação segura e compreensível até um produto real,
mantendo foco em clareza, acessibilidade, privacidade e boas decisões de engenharia.

> Status: Fase 3 — motor financeiro inicial implementado. Cartões, recorrências, orçamento e metas ainda estão no roadmap.

## Stack

- React + TypeScript + Vite
- Node.js + TypeScript + Fastify
- PostgreSQL + Prisma
- Zod para validação
- Vitest para testes unitários
- Playwright para testes end-to-end
- npm workspaces

## Arquitetura

O monorepo separa web, API, design system, validações compartilhadas, configuração e banco. Veja
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Execução local

Requisitos: Node.js 20+ e npm 10+.

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run dev:api
npm run dev
```

O frontend e a API são executados separadamente durante o desenvolvimento. O seed demo é opcional e
exige uma senha local explícita:

```bash
DEMO_PASSWORD='somente-local' npm run db:seed
```

Nunca coloque valores reais no `.env.example` ou no Git.

## Scripts

```bash
npm run dev          # frontend
npm run dev:api      # API
npm run build        # builds dos workspaces
npm run lint         # ESLint
npm run typecheck    # TypeScript strict
npm run test         # Vitest
npm run test:integration --workspace=@finance/api # integração real com TEST_DATABASE_URL
npm run test:e2e     # Playwright
npm run format:check # Prettier
npm run db:generate  # cliente Prisma
npm run db:migrate   # aplica migrations PostgreSQL
npm run db:seed      # seed demo explícito, somente desenvolvimento
```

## Estrutura

```text
apps/web       frontend
apps/api       backend HTTP
packages/ui    design tokens
packages/config ambiente
packages/db    schema Prisma
packages/validation schemas Zod
database       migrations e seeds futuros
docs           decisões e documentação
```

## Fase 3 disponível

Já estão funcionais cadastro, login, logout, sessão por cookie HttpOnly, onboarding, preferências,
contas/carteiras, categorias, receitas, despesas, transferências, filtros, paginação, cancelamento,
saldo derivado e dashboard real. O dashboard preenchido de apresentação continua acessível somente em
`/demo`.

O saldo atual é derivado dos lançamentos realizados e transferências. A regra completa está em
[`docs/FINANCIAL_DOMAIN.md`](docs/FINANCIAL_DOMAIN.md).

Os testes estão divididos em unit/domain, integração e E2E. A integração usa PostgreSQL real e o E2E
usa navegador, API e PostgreSQL reais. Localmente, sem `TEST_DATABASE_URL` ou `E2E_DATABASE_URL`, as
suítes dependentes de banco são puladas explicitamente; com `CI=true`, configuração ausente falha.
O workflow do GitHub Actions cria bancos separados, executa migrations do zero, seed, integração e
E2E autenticado. Consulte [`docs/TESTING.md`](docs/TESTING.md) para os comandos e a estratégia.

## Roadmap

1. Fundação e saneamento — atual
2. Design system e shell da aplicação
3. Autenticação, contas e categorias
4. Receitas, despesas e transações — concluída
5. Dashboard real — concluída junto à Fase 3
6. Recorrências e parcelamentos
7. Cartões e faturas
8. Orçamentos e metas
9. Relatórios e calendário
10. Patrimônio e dívidas
11. Insights e notificações
12. Testes, segurança, performance e publicação

## Segurança

Segredos são carregados por variáveis de ambiente e são bloqueados pelo `.gitignore`. O projeto não
reutiliza credenciais do protótipo anterior. Antes de uma publicação, credenciais antigas encontradas
no histórico devem ser revogadas e o histórico deve ser limpo conscientemente.

## Dados demo e screenshots

Dados de demonstração serão adicionados em seeds isolados nas fases de domínio. Screenshots serão
adicionadas aqui quando o shell visual e o dashboard existirem.
