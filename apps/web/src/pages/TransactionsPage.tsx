import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from '../components/ui';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: 'INCOME' | 'EXPENSE'; parentId: string | null };
type Activity = {
  id: string;
  kind: 'TRANSACTION' | 'TRANSFER';
  accountId: string | null;
  categoryId: string | null;
  type: 'INCOME' | 'EXPENSE' | null;
  status: 'PENDING' | 'PAID' | 'CANCELED' | 'TRANSFER';
  description: string;
  amount: string;
  transactionDate: string;
  account: { name: string } | null;
  category: { name: string } | null;
  sourceAccount: { name: string } | null;
  destinationAccount: { name: string } | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  dueDate?: string | null;
};
type Transaction = Activity & {
  kind: 'TRANSACTION';
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'PAID' | 'CANCELED';
};

const money = formatMoney;
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
const iso = (value: string) => new Date(`${value}T12:00:00`).toISOString();

export function TransactionsPage() {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Activity[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    accountId: '',
    categoryId: '',
    destinationAccountId: '',
    status: 'PAID',
    transactionDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
  });
  const preset = params.get('period') || 'month';
  const loadReferences = async () => {
    const [accountData, categoryData] = await Promise.all([
      apiFetch<Account[]>('/accounts'),
      apiFetch<Category[]>('/categories'),
    ]);
    setAccounts(accountData);
    setCategories(categoryData);
    const firstAccount = accountData[0];
    if (!form.accountId && firstAccount)
      setForm((current) => ({ ...current, accountId: firstAccount.id }));
  };
  useEffect(() => {
    void loadReferences();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const requested = params.get('new');
    if (requested === 'expense' || requested === 'income' || requested === 'transfer') {
      openNew(requested === 'expense' ? 'EXPENSE' : requested === 'income' ? 'INCOME' : 'TRANSFER');
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params]);
  useEffect(() => {
    const query = new URLSearchParams({
      page: String(page),
      limit: '20',
      sort: params.get('sort') ?? 'recent',
      period: preset,
    });
    if (search) query.set('search', search);
    if (params.get('type')) query.set('type', params.get('type')!);
    if (params.get('status')) query.set('status', params.get('status')!);
    if (params.get('accountId')) query.set('accountId', params.get('accountId')!);
    if (params.get('categoryId')) query.set('categoryId', params.get('categoryId')!);
    setLoading(true);
    void apiFetch<{ items: Activity[]; pagination: { totalPages: number } }>(`/activity?${query}`)
      .then((data) => {
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os lançamentos.'),
      )
      .finally(() => setLoading(false));
  }, [page, search, params]);
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === kind),
    [categories, kind],
  );
  const openNew = (nextKind: 'EXPENSE' | 'INCOME' | 'TRANSFER') => {
    setEditing(null);
    setKind(nextKind);
    setForm((current) => ({
      ...current,
      description: '',
      amount: '',
      categoryId: '',
      destinationAccountId: '',
      status: 'PAID',
    }));
    setOpen(true);
  };
  const openEdit = (item: Activity) => {
    if (item.kind !== 'TRANSACTION' || !item.accountId || !item.categoryId || !item.type) return;
    setEditing(item as Transaction);
    setKind(item.type);
    setForm({
      description: item.description,
      amount: item.amount,
      accountId: item.accountId,
      categoryId: item.categoryId,
      destinationAccountId: '',
      status: item.status,
      transactionDate: item.transactionDate.slice(0, 10),
      dueDate: item.dueDate?.slice(0, 10) ?? '',
      notes: '',
    });
    setOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (kind === 'TRANSFER')
        await apiFetch('/transfers', {
          method: 'POST',
          body: JSON.stringify({
            sourceAccountId: form.accountId,
            destinationAccountId: form.destinationAccountId,
            amount: form.amount,
            transferDate: iso(form.transactionDate),
            description: form.description || null,
            notes: form.notes || null,
          }),
        });
      else {
        const transactionPayload = JSON.stringify({
          accountId: form.accountId,
          categoryId: form.categoryId,
          type: kind,
          amount: form.amount,
          description: form.description,
          status: form.status,
          transactionDate: iso(form.transactionDate),
          dueDate: form.dueDate || null,
          notes: form.notes || null,
        });
        await apiFetch(editing ? `/transactions/${editing.id}` : '/transactions', {
          method: editing ? 'PATCH' : 'POST',
          body: transactionPayload,
        });
      }
      setOpen(false);
      setPage(1);
      setParams(params);
      window.dispatchEvent(new Event('finora:data-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  };
  const cancel = async (id: string) => {
    await apiFetch(`/transactions/${id}/cancel`, { method: 'POST' });
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'CANCELED' } : item)),
    );
  };
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Movimentações</p>
          <h1>Transações</h1>
          <p className="page-header__description">
            Registre e acompanhe receitas, despesas e transferências com histórico preservado.
          </p>
        </div>
        <Button onClick={() => openNew('EXPENSE')}>
          <Plus size={17} /> Nova despesa
        </Button>
      </div>
      <div className="transaction-toolbar">
        <label className="search-input">
          <Search size={17} aria-hidden="true" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Pesquisar descrição ou observação"
          />
        </label>
        <Select
          value={preset}
          onChange={(event) => {
            params.set('period', event.target.value);
            setParams(params);
          }}
        >
          <option value="month">Este mês</option>
          <option value="today">Hoje</option>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="year">Este ano</option>
        </Select>
        <Select
          value={params.get('type') ?? ''}
          onChange={(event) => {
            if (event.target.value) params.set('type', event.target.value);
            else params.delete('type');
            setParams(params);
          }}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </Select>
        <Select
          value={params.get('status') ?? ''}
          onChange={(event) => {
            if (event.target.value) params.set('status', event.target.value);
            else params.delete('status');
            setParams(params);
          }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="PAID">Pagos</option>
          <option value="PENDING">Pendentes</option>
          <option value="CANCELED">Cancelados</option>
        </Select>
        <Select
          value={params.get('accountId') ?? ''}
          onChange={(event) => {
            if (event.target.value) params.set('accountId', event.target.value);
            else params.delete('accountId');
            setParams(params);
          }}
          aria-label="Filtrar por conta"
        >
          <option value="">Todas as contas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
        <Select
          value={params.get('categoryId') ?? ''}
          onChange={(event) => {
            if (event.target.value) params.set('categoryId', event.target.value);
            else params.delete('categoryId');
            setParams(params);
          }}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          value={params.get('sort') ?? 'recent'}
          onChange={(event) => {
            params.set('sort', event.target.value);
            setParams(params);
          }}
          aria-label="Ordenar lançamentos"
        >
          <option value="recent">Mais recentes</option>
          <option value="oldest">Mais antigas</option>
          <option value="highest">Maior valor</option>
          <option value="lowest">Menor valor</option>
        </Select>
        <Button variant="secondary" onClick={() => openNew('INCOME')}>
          Nova receita
        </Button>
        <Button variant="secondary" onClick={() => openNew('TRANSFER')}>
          <ArrowLeftRight size={16} /> Transferência
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Card className="transaction-card">
        <div className="transaction-table-header">
          <span>Movimentação</span>
          <span>Conta</span>
          <span>Data</span>
          <span>Status</span>
          <span>Valor</span>
          <span />
        </div>
        {loading ? (
          <div className="loading-message">Carregando lançamentos…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight />}
            title="Você ainda não possui movimentações"
            description="Adicione sua primeira receita ou despesa para começar a construir seu histórico."
            action={<Button onClick={() => openNew('EXPENSE')}>Adicionar despesa</Button>}
          />
        ) : (
          <div className="transaction-table-body">
            {items.map((item) =>
              item.kind === 'TRANSACTION' && item.type ? (
                <div className="transaction-table-row" key={`${item.kind}-${item.id}`}>
                  <div className="transaction-row__main">
                    <span
                      className={`transaction-row__icon transaction-row__icon--${item.type.toLowerCase()}`}
                    >
                      {item.type === 'INCOME' ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <span>
                      <strong>{item.description}</strong>
                      <small>{item.category?.name}</small>
                    </span>
                  </div>
                  <span>{item.account?.name}</span>
                  <span>{dateLabel(item.transactionDate)}</span>
                  <Badge
                    tone={
                      item.status === 'PAID'
                        ? 'positive'
                        : item.status === 'CANCELED'
                          ? 'negative'
                          : 'warning'
                    }
                  >
                    {item.status === 'PAID'
                      ? 'Pago'
                      : item.status === 'CANCELED'
                        ? 'Cancelado'
                        : 'Pendente'}
                  </Badge>
                  <strong
                    className={item.type === 'INCOME' ? 'amount-positive' : 'amount-negative'}
                  >
                    {item.type === 'INCOME' ? '+' : '-'} {money(item.amount)}
                  </strong>
                  <span className="transaction-row-actions">
                    <Button variant="ghost" onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void cancel(item.id)}
                      disabled={item.status === 'CANCELED'}
                    >
                      Cancelar
                    </Button>
                  </span>
                </div>
              ) : (
                <div
                  className="transaction-table-row transaction-table-row--transfer"
                  key={`${item.kind}-${item.id}`}
                >
                  <div className="transaction-row__main">
                    <span className="transaction-row__icon">
                      <ArrowLeftRight size={17} />
                    </span>
                    <span>
                      <strong>{item.description}</strong>
                      <small>
                        {item.sourceAccount?.name} → {item.destinationAccount?.name}
                      </small>
                    </span>
                  </div>
                  <span>{item.destinationAccount?.name}</span>
                  <span>{dateLabel(item.transactionDate)}</span>
                  <Badge>Transferência</Badge>
                  <strong>{money(item.amount)}</strong>
                  <span>—</span>
                </div>
              ),
            )}
          </div>
        )}
        <div className="pagination">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </Button>
        </div>
      </Card>
      <Modal
        open={open}
        title={
          editing
            ? 'Editar lançamento'
            : kind === 'TRANSFER'
              ? 'Nova transferência'
              : kind === 'INCOME'
                ? 'Nova receita'
                : 'Nova despesa'
        }
        onClose={() => setOpen(false)}
      >
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label className="form-field">
            <span>Descrição</span>
            <Input
              required
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              autoFocus
            />
          </label>
          <label className="form-field">
            <span>Valor</span>
            <Input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </label>
          <label className="form-field">
            <span>{kind === 'TRANSFER' ? 'Conta de origem' : 'Conta'}</span>
            <Select
              required
              value={form.accountId}
              onChange={(event) => setForm({ ...form, accountId: event.target.value })}
            >
              <option value="">Selecione</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </label>
          {kind === 'TRANSFER' ? (
            <label className="form-field">
              <span>Conta de destino</span>
              <Select
                required
                value={form.destinationAccountId}
                onChange={(event) => setForm({ ...form, destinationAccountId: event.target.value })}
              >
                <option value="">Selecione</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : (
            <>
              <label className="form-field">
                <span>Categoria</span>
                <Select
                  required
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="form-field">
                <span>Status</span>
                <Select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  <option value="PAID">Pago</option>
                  <option value="PENDING">Pendente</option>
                </Select>
              </label>
            </>
          )}
          <label className="form-field">
            <span>Data</span>
            <Input
              required
              type="date"
              value={form.transactionDate}
              onChange={(event) => setForm({ ...form, transactionDate: event.target.value })}
            />
          </label>
          {kind !== 'TRANSFER' && form.status === 'PENDING' && (
            <label className="form-field">
              <span>Vencimento (opcional)</span>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </label>
          )}
          <label className="form-field">
            <span>Observação (opcional)</span>
            <Input
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>
          <Button type="submit">Salvar</Button>
        </form>
      </Modal>
    </div>
  );
}
