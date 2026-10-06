import { useEffect, useState, type FormEvent } from 'react';
import { Landmark, MoreHorizontal, Plus, WalletCards } from 'lucide-react';
import { Button, Card, EmptyState, Modal } from '../components/ui';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

type Account = {
  id: string;
  name: string;
  type: string;
  initialBalance: string;
  currentBalance: string;
  institution?: string | null;
  isActive: boolean;
};
const labels: Record<string, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  DIGITAL_WALLET: 'Carteira digital',
  INVESTMENT: 'Investimentos',
  OTHER: 'Outra',
};
export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'CHECKING',
    initialBalance: '0',
    institution: '',
  });
  const load = async () => setAccounts(await apiFetch<Account[]>('/accounts'));
  useEffect(() => {
    void load();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await apiFetch(editing ? `/accounts/${editing.id}` : '/accounts', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      setOpen(false);
      setEditing(null);
      setForm({ name: '', type: 'CHECKING', initialBalance: '0', institution: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  };
  const archive = async (id: string) => {
    await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
    await load();
  };
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Organização</p>
          <h1>Contas e carteiras</h1>
          <p className="page-header__description">
            Suas fontes de dinheiro, separadas por tipo. O saldo atual é calculado a partir do saldo
            inicial, lançamentos pagos e transferências realizadas.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} /> Nova conta
        </Button>
      </div>
      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<WalletCards />}
            title="Nenhuma conta cadastrada"
            description="Adicione sua primeira conta para começar a estruturar seu espaço financeiro."
            action={<Button onClick={() => setOpen(true)}>Adicionar conta</Button>}
          />
        </Card>
      ) : (
        <div className="resource-grid">
          {accounts.map((account) => (
            <Card className="resource-card" key={account.id}>
              <div className="resource-card__top">
                <span className="resource-card__icon">
                  <Landmark size={20} />
                </span>
                <button className="dashboard-card__action" aria-label={`Opções de ${account.name}`}>
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <h2>{account.name}</h2>
              <p>
                {labels[account.type]}
                {account.institution ? ` · ${account.institution}` : ''}
              </p>
              <strong>{formatMoney(account.currentBalance)}</strong>
              <div className="resource-card__actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(account);
                    setForm({
                      name: account.name,
                      type: account.type,
                      initialBalance: account.initialBalance,
                      institution: account.institution || '',
                    });
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => void archive(account.id)}>
                  Arquivar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={open}
        title={editing ? 'Editar conta' : 'Nova conta'}
        onClose={() => setOpen(false)}
      >
        <form className="auth-form" onSubmit={submit}>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <label className="form-field">
            <span>Nome</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="form-field">
            <span>Tipo</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Instituição (opcional)</span>
            <input
              value={form.institution}
              onChange={(event) => setForm({ ...form, institution: event.target.value })}
            />
          </label>
          <label className="form-field">
            <span>Saldo inicial</span>
            <input
              required
              type="number"
              step="0.01"
              value={form.initialBalance}
              onChange={(event) => setForm({ ...form, initialBalance: event.target.value })}
            />
          </label>
          <Button type="submit">Salvar conta</Button>
        </form>
      </Modal>
    </div>
  );
}
