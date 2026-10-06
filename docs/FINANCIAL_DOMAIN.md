# Motor financeiro

## Modelo

`Transaction` representa apenas receita ou despesa. `Transfer` é uma entidade separada com conta de origem e destino. Assim, mover dinheiro entre contas não aparece como receita ou despesa nos relatórios consolidados.

Valores são armazenados em PostgreSQL como `DECIMAL(14,2)`. A API recebe valores decimais como strings e o domínio converte-os para centavos `bigint` durante cálculos. A serialização de saída volta a ser uma string decimal, evitando erros de ponto flutuante.

O valor máximo suportado é `999.999.999.999,99` (12 dígitos inteiros e 2 casas). A API rejeita overflow antes da persistência. São aceitos ponto ou vírgula como separador decimal, sem separador de milhar, sinal positivo, notação científica, `NaN` ou infinito.

## Saldo

```text
saldo atual = saldo inicial + receitas PAID - despesas PAID
            + transferências recebidas - transferências enviadas
```

O saldo consolidado soma os saldos individuais; por isso uma transferência entre duas contas é neutra no consolidado. Lançamentos `PENDING` e `CANCELED` não afetam o saldo realizado. O saldo previsto inclui lançamentos não cancelados, inclusive pendentes, e é apresentado como estimativa.

Contas podem ficar negativas. Transferência futura não entra no saldo atual, mas entra no previsto; quando sua data passa, a derivação passa a incluí-la automaticamente.

## Status e cancelamento

`PENDING` e `PAID` são persistidos. Atraso é derivado quando o status é `PENDING` e o vencimento já passou. `CANCELED` preserva o histórico e não altera saldos.

Cancelamento é idempotente por estado: a primeira chamada altera o status; uma segunda chamada retorna `404 NOT_FOUND` sem efeito financeiro. Transação cancelada é imutável; não há restauração nesta fase.

## Períodos e timezone

Os períodos usam o timezone IANA salvo em `UserPreference`, validado pela API. O padrão inicial é `America/Sao_Paulo` e a semana, quando usada em relatórios futuros, começará na segunda-feira. O dashboard da Fase 3 usa hoje, 7 dias, 30 dias, mês, mês anterior e ano. Todos os intervalos são semiabertos: `>= início` e `< próximo limite`, inclusive em transições de DST.

## Integridade e API

Criação de transferência usa uma transação do banco. Contas e categorias são verificadas no escopo do usuário autenticado; IDs enviados pelo cliente nunca determinam o `userId`. Contas e categorias são arquivadas, e não removidas.

- `GET/POST /transactions`
- `GET/PATCH /transactions/:id`
- `POST /transactions/:id/cancel`
- `GET/POST /transfers`
- `GET /dashboard/summary`
- `GET /dashboard/categories`
- `GET /dashboard/upcoming`

`GET /transactions` usa paginação offset/limit, limite máximo 100, filtros no banco, busca por descrição/observação e ordenação por uma lista permitida. A página `/transacoes` usa `GET /activity`, que combina transações e transferências em uma consulta SQL unificada, com paginação e ordenação globais; `GET /transfers` permanece legado e limitado a 100 itens.

As invariantes auditadas estão em `docs/FINANCIAL_INVARIANTS.md`. A auditoria de produção da Fase 3.5 e seus limites de validação estão em `docs/PHASE_3_5_AUDIT.md`.
