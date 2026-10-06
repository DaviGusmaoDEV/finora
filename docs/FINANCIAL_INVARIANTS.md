# Invariantes financeiras — Fase 3.5

Estas propriedades devem permanecer verdadeiras enquanto `Transaction` e `Transfer` continuarem sendo modelos separados:

- **A — transferência interna é neutra no consolidado:** a saída de uma conta e a entrada na outra se cancelam quando os saldos individuais são somados.
- **B — cancelado tem efeito zero:** `CANCELED` não entra no saldo atual, no saldo previsto, em receitas, despesas ou fluxo de caixa.
- **C — pendente não altera saldo atual:** `PENDING` só participa do saldo previsto.
- **D — edição substitui o efeito:** os saldos são derivados dos registros atuais; editar valor, status, conta ou tipo não cria lançamento compensatório nem efeito duplicado.
- **E — consolidado é a soma das contas ativas:** a mesma regra de domínio é aplicada por conta e depois somada.
- **F — isolamento por usuário:** toda leitura e mutação financeira é limitada ao `userId` da sessão; referências de conta e categoria também são validadas nesse escopo.

## Decisões confirmadas

- Dinheiro de entrada e saída aceita somente string decimal não negativa, com ponto ou vírgula e no máximo duas casas; não aceita separador de milhar, sinal positivo, notação científica, `NaN` ou infinito.
- O limite de `DECIMAL(14,2)` é `999.999.999.999,99` (99.999.999.999.999 centavos). Valores acima são rejeitados pela validação antes do PostgreSQL.
- Conta pode ficar negativa. Transferência pode deixar a conta de origem negativa.
- Transferência futura não altera saldo atual; entra no saldo previsto. Ao cruzar a data/hora corrente, passa a entrar no saldo atual por ser derivada, sem job manual.
- Cancelamento é idempotente por estado: a primeira chamada cancela; chamadas posteriores retornam `404 NOT_FOUND` e não alteram o efeito financeiro. Transação cancelada é imutável.
- Conta e categoria são arquivadas (`isActive=false`), não excluídas. Histórico continua referenciando os registros. Foreign keys de transações e transferências usam `RESTRICT`; dados do usuário usam `CASCADE`.
- Períodos usam intervalos semiabertos `[from, to)`, baseados no calendário do timezone da preferência.
- `/activity` é o feed unificado de `Transaction` e `Transfer`, com `UNION ALL`, ordenação global, filtros SQL e paginação global. `GET /transfers` é apenas um endpoint legado limitado a 100 itens.

## Parser e apresentação

O domínio calcula exclusivamente em centavos `bigint`; PostgreSQL persiste `DECIMAL(14,2)`; a API serializa valores como strings. A apresentação web não converte valores monetários para `Number`; somente medidas visuais não financeiras podem usar números de ponto flutuante.
