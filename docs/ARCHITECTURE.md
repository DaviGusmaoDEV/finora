# Arquitetura

O projeto usa um monorepo npm com separação entre aplicações e pacotes compartilhados.

- `apps/web`: frontend React + Vite.
- `apps/api`: API Node.js + Fastify.
- `packages/ui`: tokens visuais compartilhados.
- `packages/validation`: schemas Zod compartilhados.
- `packages/config`: validação de variáveis de ambiente.
- `packages/db`: schema Prisma, migration e seed para PostgreSQL.

Na Fase 3, a API usa sessões stateful em cookie HttpOnly, Argon2id para senha e escopo de usuário
em todas as consultas privadas. O motor financeiro separa `Transaction` de `Transfer`, com cálculo
de saldo derivado no domínio. O dashboard demo fica isolado em `/demo`; usuários autenticados sem
movimentações veem um estado vazio próprio.

O Prisma foi escolhido nesta fundação por oferecer migrations, tipos gerados e uma curva de entrada
clara para um projeto de portfólio. Cartões, recorrências e demais recursos serão adicionados por
migrations posteriores, sem ampliar o modelo financeiro prematuramente.
