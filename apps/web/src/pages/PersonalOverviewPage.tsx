import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Lightbulb, Plus, WalletCards } from 'lucide-react';
import { Button, Card, EmptyState, FinancialCard, Skeleton } from '../components/ui';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../lib/money';

type Summary = {
  balance: string;
  projectedBalance: string;
  income: string;
  expense: string;
  result: string;
  comparison: { income: number | null; expense: number | null; result: number | null };
};
type Category = { name: string; amount: string; percent: number };
type Upcoming = {
  id: string;
  description: string;
  amount: string;
  dueDate: string | null;
  overdue: boolean;
  category: { name: string };
};
type CashFlow = { date: string; income: string; expense: string };
const currency = formatMoney;
const comparison = (value: number | null, label: string) =>
  value === null
    ? 'Sem base anterior'
    : `${value >= 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}% ${label}`;

export function PersonalOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextCategories, nextUpcoming] = await Promise.all([
        apiFetch<Summary>('/dashboard/summary?period=month'),
        apiFetch<Category[]>('/dashboard/categories?period=month'),
        apiFetch<Upcoming[]>('/dashboard/upcoming'),
      ]);
      setSummary(nextSummary);
      setCategories(nextCategories);
      setUpcoming(nextUpcoming);
      setCashFlow(await apiFetch<CashFlow[]>('/dashboard/cash-flow?period=month'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar sua visão geral.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener('finora:data-changed', handler);
    return () => window.removeEventListener('finora:data-changed', handler);
  }, []);
  if (loading)
    return (
      <div className="dashboard-loading">
        <Skeleton height="2rem" width="35%" />
        <div className="financial-grid">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} height="9rem" />
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <Card>
        <EmptyState
          icon={<WalletCards />}
          title="Não foi possível carregar a visão geral"
          description={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
        />
      </Card>
    );
  const hasData =
    summary &&
    (summary.income !== '0.00' || summary.expense !== '0.00' || summary.balance !== '0.00');
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Seu espaço pessoal</p>
          <h1>Olá, {user?.name.split(' ')[0]}.</h1>
          <p className="page-header__description">
            Um resumo real do seu mês, calculado a partir das movimentações registradas.
          </p>
        </div>
        <Button onClick={() => navigate('/transacoes?new=expense')}>
          <Plus size={17} /> Adicionar
        </Button>
      </div>
      {!hasData ? (
        <Card>
          <EmptyState
            icon={<WalletCards />}
            title="Você ainda não possui movimentações"
            description="O saldo atual parte do saldo inicial das suas contas. Registre uma receita ou despesa para acompanhar sua evolução."
            action={
              <div className="empty-state__actions">
                <Button onClick={() => navigate('/transacoes?new=income')}>
                  Adicionar receita
                </Button>
                <Button variant="secondary" onClick={() => navigate('/transacoes?new=expense')}>
                  Adicionar despesa
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="financial-grid">
            <FinancialCard
              label="Saldo atual"
              value={currency(summary!.balance)}
              comparison={`Previsto: ${currency(summary!.projectedBalance)}`}
              icon={<WalletCards size={18} />}
            />
            <FinancialCard
              label="Receitas do mês"
              value={currency(summary!.income)}
              comparison={comparison(summary!.comparison.income, 'vs. período anterior')}
              tone="positive"
              icon={<ArrowDownLeft size={18} />}
            />
            <FinancialCard
              label="Despesas do mês"
              value={currency(summary!.expense)}
              comparison={comparison(summary!.comparison.expense, 'vs. período anterior')}
              tone="negative"
              icon={<ArrowUpRight size={18} />}
            />
            <FinancialCard
              label="Resultado do mês"
              value={currency(summary!.result)}
              comparison={comparison(summary!.comparison.result, 'vs. período anterior')}
              icon={<Lightbulb size={18} />}
            />
          </div>
          <Card className="dashboard-card cash-flow-card">
            <div className="dashboard-card__header">
              <div>
                <h2 className="dashboard-card__title">Fluxo de caixa</h2>
                <p className="dashboard-card__subtitle">Receitas e despesas realizadas no mês</p>
              </div>
            </div>
            {cashFlow.length === 0 ? (
              <EmptyState
                icon={<ArrowDownLeft />}
                title="Sem movimentações no período"
                description="O fluxo será preenchido conforme você registrar receitas e despesas pagas."
              />
            ) : (
              <div className="cash-flow-list">
                {cashFlow.slice(-14).map((item) => {
                  const max = Math.max(
                    ...cashFlow.map((entry) =>
                      Math.max(Number(entry.income), Number(entry.expense)),
                    ),
                    1,
                  );
                  return (
                    <div className="cash-flow-row" key={item.date}>
                      <time>
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        }).format(new Date(`${item.date}T12:00:00Z`))}
                      </time>
                      <div className="cash-flow-bars">
                        <span
                          className="cash-flow-bar cash-flow-bar--income"
                          style={{ width: `${(Number(item.income) / max) * 100}%` }}
                        >
                          <small>Receitas {currency(item.income)}</small>
                        </span>
                        <span
                          className="cash-flow-bar cash-flow-bar--expense"
                          style={{ width: `${(Number(item.expense) / max) * 100}%` }}
                        >
                          <small>Despesas {currency(item.expense)}</small>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <div className="dashboard-grid">
            <Card className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2 className="dashboard-card__title">Despesas por categoria</h2>
                  <p className="dashboard-card__subtitle">Realizadas neste mês</p>
                </div>
              </div>
              {categories.length === 0 ? (
                <EmptyState
                  icon={<ArrowUpRight />}
                  title="Sem despesas no período"
                  description="Quando você registrar uma despesa paga, ela aparecerá aqui."
                />
              ) : (
                <div className="category-list">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <div className="category-row__meta">
                        <span>{category.name}</span>
                        <strong>
                          {currency(category.amount)} ·{' '}
                          {category.percent.toFixed(1).replace('.', ',')}%
                        </strong>
                      </div>
                      <div className="progress">
                        <div
                          className="progress__bar"
                          style={{ width: `${Math.min(category.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2 className="dashboard-card__title">Próximos vencimentos</h2>
                  <p className="dashboard-card__subtitle">Despesas pendentes</p>
                </div>
                <button className="dashboard-card__action" onClick={() => navigate('/transacoes')}>
                  Ver todas
                </button>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<WalletCards />}
                  title="Nada pendente por aqui"
                  description="Suas próximas contas aparecerão nesta área."
                />
              ) : (
                <div className="bill-list">
                  {upcoming.map((item) => (
                    <div className="bill-row" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <small>
                          {item.category.name} ·{' '}
                          {item.dueDate
                            ? new Intl.DateTimeFormat('pt-BR').format(new Date(item.dueDate))
                            : 'Sem vencimento'}
                        </small>
                      </div>
                      <strong className={item.overdue ? 'amount-negative' : ''}>
                        {currency(item.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          <Card className="insight-card">
            <div className="insight">
              <Lightbulb className="insight__icon" size={19} />
              <div>
                <strong>Insight do período</strong>
                <p>
                  {summary!.expense === '0.00'
                    ? 'Registre sua primeira despesa para receber uma leitura simples do seu comportamento financeiro.'
                    : `Você realizou ${currency(summary!.expense)} em despesas neste mês. O saldo previsto considera lançamentos pendentes e é uma estimativa.`}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
