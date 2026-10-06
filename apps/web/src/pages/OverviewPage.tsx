import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Car,
  Coffee,
  Lightbulb,
  MoreHorizontal,
  ShoppingBasket,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  demoBills,
  demoCategories,
  demoSummary,
  demoTransactions,
  demoTrend,
} from '../mocks/demoData';
import { Badge, Button, Card, FinancialCard } from '../components/ui';

const iconMap = { wallet: Wallet, income: ArrowDownLeft, expense: ArrowUpRight, savings: Banknote };
const transactionIconMap = {
  shopping: ShoppingBasket,
  briefcase: BriefcaseBusiness,
  coffee: Coffee,
  car: Car,
};

function TrendChart() {
  const max = Math.max(...demoTrend.map((point) => point.value));
  const points = demoTrend
    .map((point, index) => `${index * 20 + 5},${88 - (point.value / max) * 62}`)
    .join(' ');
  return (
    <div className="chart-wrap" aria-label="Evolução do saldo demonstrativa">
      <svg viewBox="0 0 110 110" role="img">
        <title>Evolução do saldo nos últimos seis meses</title>
        {[26, 47, 68, 88].map((y) => (
          <line key={y} className="chart-grid-line" x1="5" x2="105" y1={y} y2={y} />
        ))}
        <polygon className="chart-area" points={`5,88 ${points} 105,88`} />
        <polyline className="chart-line" points={points} />
        {demoTrend.map((point, index) => (
          <g key={point.label}>
            <circle
              className="chart-dot"
              cx={index * 20 + 5}
              cy={88 - (point.value / max) * 62}
              r="2.5"
            />
            <text className="chart-axis-label" x={index * 20 + 5} y="104" textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="legend">
        <span>
          <i /> Saldo acumulado
        </span>
        <span>
          <i className="i--muted" /> Referência
        </span>
      </div>
    </div>
  );
}

export function OverviewPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Quarta-feira, 8 de outubro</p>
          <h1>
            Bom dia, Marina <span aria-hidden="true">✦</span>
          </h1>
          <p className="page-header__description">
            Aqui está um resumo claro para você tomar as próximas decisões com tranquilidade.
          </p>
        </div>
        <div className="page-header__actions">
          <Button variant="secondary">Personalizar visão</Button>
          <Button>+ Adicionar</Button>
        </div>
      </div>
      <div className="dashboard-toolbar">
        <div>
          <strong className="dashboard-toolbar__title">Resumo financeiro</strong>
          <span className="dashboard-toolbar__caption"> · Outubro de 2025</span>
        </div>
        <div className="dashboard-toolbar__filters">
          {['Hoje', '7 dias', '30 dias', 'Este mês', 'Este ano'].map((period, index) => (
            <button
              key={period}
              className={`period-button ${index === 3 ? 'period-button--active' : ''}`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="financial-grid">
        {demoSummary.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          return (
            <FinancialCard
              key={item.label}
              label={item.label}
              value={item.value}
              comparison={item.comparison}
              tone={item.tone}
              icon={<Icon size={18} aria-hidden="true" />}
            />
          );
        })}
      </div>
      <div className="dashboard-grid">
        <Card className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2 className="dashboard-card__title">Evolução do saldo</h2>
              <p className="dashboard-card__subtitle">Acompanhe seu saldo ao longo do tempo</p>
            </div>
            <button className="dashboard-card__action">Ver detalhes</button>
          </div>
          <TrendChart />
        </Card>
        <Card className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2 className="dashboard-card__title">Despesas por categoria</h2>
              <p className="dashboard-card__subtitle">Onde seu dinheiro está indo</p>
            </div>
            <button className="dashboard-card__action" aria-label="Mais opções">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="category-list">
            {demoCategories.map((category) => (
              <div key={category.name}>
                <div className="category-row__meta">
                  <span>{category.name}</span>
                  <strong className="category-row__amount">{category.value}</strong>
                </div>
                <div className="progress">
                  <div className="progress__bar" style={{ width: `${category.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="dashboard-grid dashboard-grid--equal">
        <Card className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2 className="dashboard-card__title">Últimas movimentações</h2>
              <p className="dashboard-card__subtitle">Dados de demonstração</p>
            </div>
            <button className="dashboard-card__action">Ver todas</button>
          </div>
          <div className="transaction-list">
            {demoTransactions.map((item) => {
              const Icon = transactionIconMap[item.icon as keyof typeof transactionIconMap];
              return (
                <div className="transaction-row" key={item.name}>
                  <div className="transaction-row__main">
                    <span className="transaction-row__icon">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="transaction-row__name">{item.name}</strong>
                      <small className="transaction-row__meta">{item.category}</small>
                    </span>
                  </div>
                  <span
                    className={`transaction-row__amount ${item.positive ? 'transaction-row__amount--positive' : ''}`}
                  >
                    {item.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2 className="dashboard-card__title">Próximos vencimentos</h2>
              <p className="dashboard-card__subtitle">Contas planejadas para outubro</p>
            </div>
            <button className="dashboard-card__action">Calendário</button>
          </div>
          <div className="bill-list">
            {demoBills.map((bill, index) => (
              <div className="bill-row" key={bill.name}>
                <div className="bill-row__main">
                  <span className="bill-row__date">{bill.date}</span>
                  <span>
                    <strong className="bill-row__name">{bill.name}</strong>
                    <small className="bill-row__meta">{bill.amount}</small>
                  </span>
                </div>
                <Badge tone={index === 0 ? 'warning' : 'neutral'}>{bill.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="insight-card">
        <div className="insight">
          <Sparkles className="insight__icon" size={19} aria-hidden="true" />
          <div>
            <strong>
              <Lightbulb size={14} aria-hidden="true" /> Insight demonstrativo
            </strong>
            <p>
              Suas despesas com alimentação estão 12% menores que no mês passado. Mantendo esse
              ritmo, sua economia estimada pode chegar a R$ 5.900,00.{' '}
              <em>Esta é uma estimativa baseada em dados demo.</em>
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
