# Banco de dados local

O schema Prisma é a fonte de tipos e a migration executada pelo comando `npm run db:migrate` fica
em `packages/db/prisma/migrations`. O arquivo em `database/migrations` é mantido como cópia legível
da migration para a documentação do repositório; migrations aplicadas não devem ser editadas.

```bash
docker compose up -d
cp .env.example .env
npm run db:migrate
DEMO_PASSWORD='somente-local' npm run db:seed
```

A migration `0002_financial_engine` adiciona `transactions` e `transfers`. A migration Prisma em
`packages/db/prisma/migrations` é a fonte executável; `database/migrations` é uma cópia documental.
Não edite migrations já aplicadas: crie uma nova migration para cada mudança.

Para resetar um banco local, apague o volume do Docker conscientemente:

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
```

O seed demo é explícito e não deve ser executado em produção.
