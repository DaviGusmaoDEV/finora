# Relatório de auditoria — Fase 3.5

Data da auditoria: 2026-10-06.

## Veredito

**NÃO APROVADO PARA FASE 4.** O código local está com as verificações estáticas, unitárias e de domínio verdes e as correções desta auditoria aplicadas, mas não é tecnicamente aceitável liberar a Fase 4 antes de executar PostgreSQL real, migrations do zero, integração e E2E autenticado.

## Bugs encontrados e correções

| Severidade | Bug                                                     | Causa                                                                                                             | Correção/regressão                                                                                    |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Alta       | `typecheck` quebrava no feed unificado                  | `Activity` não era estreitado antes de editar/renderizar `type`                                                   | Guardas de união corrigidas em `TransactionsPage`; typecheck/build cobrem a regressão                 |
| Alta       | vencimento “hoje” podia aparecer atrasado               | `/dashboard/upcoming` comparava `DATE` UTC com `new Date()` instantâneo; meia-noite UTC não é início do dia local | cálculo compara datas civis no timezone da preferência e `isOverdue`; testes de fronteira adicionados |
| Média      | fluxo de caixa agrupava pelo dia UTC                    | `toISOString().slice(0, 10)` ignorava timezone do usuário                                                         | agrupamento por `localDateKey`; teste de virada de dia adicionado                                     |
| Média      | apresentação convertia strings monetárias para `Number` | risco de arredondamento em valores grandes                                                                        | formatter decimal textual no frontend                                                                 |
| Média      | timezone inválido podia virar erro 500                  | schema aceitava qualquer texto                                                                                    | schema valida o identificador via `Intl.DateTimeFormat`                                               |
| Média      | transferência zero dependia somente do check do banco   | feedback tardio/erro bruto em ambientes sem migration                                                             | schema rejeita zero antes da persistência                                                             |

## O que foi verificado

- Precisão: parser e domínio cobrem centavos pequenos, 100 × R$ 0,01, limite máximo e overflow; `bigint` permanece no domínio.
- Saldos: regras PAID/PENDING/CANCELED, saldo projetado, saldo negativo e neutralidade de transferências estão cobertas pelo domínio; invariantes completas de API aguardam PostgreSQL real.
- Transferências: contas distintas, conta ativa e pertencimento ao usuário são exigidos; criação usa `$transaction`; feed unificado tem paginação global.
- Autorização/IDOR: integração existente cobre leitura, PATCH, cancelamento e referência cruzada; precisa ser executada com PostgreSQL.
- Integridade: migrations contêm enums, FKs, índices, `RESTRICT` para histórico, `CASCADE` por usuário e checks de valor positivo/contas distintas.
- Períodos/timezone: intervalos `[from,to)`, São Paulo, UTC, New York e transição DST têm testes de domínio; integração com datas persistidas aguarda banco.
- Concorrência: como saldo é derivado, não há lost update de saldo materializado; criação de transferência é atômica. Teste concorrente real aguarda PostgreSQL.
- Segurança: não foram encontrados segredos hardcoded, logs de sessão/senha ou envio de `DATABASE_URL` ao frontend. Nenhum histórico Git foi reescrito.
- Performance: índices relevantes existem para usuário/data, status/vencimento, tipo, conta e categoria. O dashboard ainda carrega registros completos e agrega em JavaScript; isso é dívida de performance, não foi reescrito sem benchmark real.
- Responsividade/acessibilidade: CSS possui breakpoints para mobile/tablet/desktop, dialogs têm `role=dialog`, botões de ícone têm `aria-label` e erros têm `role=alert`; auditoria visual automatizada em 320/375/768/1024/1440 ainda precisa de navegador com o backend real.

## Validação executada

Passaram localmente: `db:generate`, `lint`, `typecheck`, `test` (10 API + 2 web + 2 validation), `build`, `format:check` após as alterações e `prisma validate` com `DATABASE_URL` sintática de teste.

E2E executado sem `E2E_DATABASE_URL`: 3 testes demo passaram e 5 testes autenticados foram skipped por configuração ausente. Isso não comprova o fluxo autenticado.

Não executados: migrations/seed contra PostgreSQL real, testes de integração e E2E autenticado. Motivo: Docker não está instalado/rodando e não há servidor PostgreSQL local acessível. Os testes de integração são `skipIf(TEST_DATABASE_URL)`; os E2E são `skip` sem `E2E_DATABASE_URL`, portanto skipped não foram tratados como passed.

O workflow `.github/workflows/ci.yml` fornece PostgreSQL 16 como service, aplica migrations, executa integração e E2E. CI é a primeira comprovação real pendente.

### Preparação da Fase 3.6

O workflow foi separado em jobs de qualidade, integração e E2E, com bancos PostgreSQL distintos, `CI=true` fail-fast para variáveis ausentes, seed idempotente e artefatos Playwright em falha. A execução efetiva desses jobs depende de commit/push autorizado pelo proprietário.

## NPM audit

O `npm audit --omit=optional --audit-level=moderate` foi executado fora do sandbox e encontrou 6 vulnerabilidades: 1 moderada em `@vitest/mocker`, 3 altas (incluindo `deepmerge-ts`), e 2 críticas em `tinypool`, todas em tooling/dev. A correção automática com `--force` exigiria Vitest 5 (breaking change); não foi aplicada. `deepmerge-ts` está na cadeia `prisma -> @prisma/config -> deepmerge-ts`, conforme a pendência conhecida.

## Dívidas restantes antes da Fase 4

1. Executar CI/PostgreSQL real e corrigir qualquer falha de migration, seed, integração, concorrência ou E2E.
2. Substituir ou paginar o endpoint legado `GET /transfers`; `/activity` já é o contrato correto para histórico unificado.
3. Migrar agregações pesadas do dashboard para SQL agregado depois de medir queries no PostgreSQL.
4. Fazer auditoria visual real de mobile, teclado/foco e formulários com navegador autenticado.
