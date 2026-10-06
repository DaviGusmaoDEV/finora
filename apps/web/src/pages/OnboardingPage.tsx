import { useState, type FormEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';

const suggestedExpense = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Assinaturas',
  'Contas',
  'Impostos',
  'Outros',
];
const suggestedIncome = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Reembolsos',
  'Presentes',
  'Outras receitas',
];

export function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('BRL');
  const [locale, setLocale] = useState('pt-BR');
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
  );
  const [theme, setTheme] = useState<'SYSTEM' | 'LIGHT' | 'DARK'>('SYSTEM');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [account, setAccount] = useState({ name: '', type: 'CHECKING', initialBalance: '0' });
  const [selected, setSelected] = useState([...suggestedExpense, ...suggestedIncome]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const savePreferences = async () => {
    await apiFetch('/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ currency, locale, timezone, theme, dateFormat }),
    });
  };
  const submitAccount = async () => {
    if (!account.name.trim()) throw new Error('Informe um nome para sua primeira conta.');
    await apiFetch('/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  };
  const finish = async () => {
    const selectedExpense = selected.filter((name) => suggestedExpense.includes(name));
    const selectedIncome = selected.filter((name) => suggestedIncome.includes(name));
    await Promise.all([
      ...selectedExpense.map((name) =>
        apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify({ name, type: 'EXPENSE' }),
        }),
      ),
      ...selectedIncome.map((name) =>
        apiFetch('/categories', { method: 'POST', body: JSON.stringify({ name, type: 'INCOME' }) }),
      ),
    ]);
    await apiFetch('/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        currency,
        locale,
        timezone,
        theme,
        dateFormat,
        onboardingCompleted: true,
      }),
    });
    localStorage.setItem('finora-theme', theme.toLowerCase());
    document.documentElement.dataset.theme =
      theme === 'SYSTEM'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme.toLowerCase();
    await refresh();
    navigate('/visao-geral');
  };
  const next = async () => {
    setBusy(true);
    setError('');
    try {
      if (step === 2) await savePreferences();
      if (step === 3) await submitAccount();
      if (step < 5) setStep(step + 1);
      else await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível avançar.');
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void next();
  };
  return (
    <main className="onboarding-page">
      <div className="onboarding-brand">
        <span className="brand-mark">F</span>
        <span className="brand-name">Finora</span>
      </div>
      <div className="onboarding-progress">
        <span>Passo {step} de 5</span>
        <div>
          <i style={{ width: `${step * 20}%` }} />
        </div>
      </div>
      <Card className="onboarding-card">
        <form onSubmit={onSubmit}>
          {step === 1 && (
            <div className="onboarding-step">
              <span className="onboarding-icon">
                <WalletCards size={24} />
              </span>
              <h1>Vamos preparar seu espaço financeiro.</h1>
              <p>
                Em poucos passos, você terá uma base pessoal organizada para começar com clareza.
              </p>
              <div className="onboarding-note">
                Você poderá alterar tudo depois em Configurações.
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="onboarding-step">
              <h1>Suas preferências</h1>
              <p>Começamos com escolhas simples para que o Finora tenha a sua cara.</p>
              <label className="form-field">
                <span>Moeda</span>
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="BRL">Real brasileiro (BRL)</option>
                  <option value="USD">Dólar americano (USD)</option>
                </select>
              </label>
              <label className="form-field">
                <span>Idioma</span>
                <select value={locale} onChange={(event) => setLocale(event.target.value)}>
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </label>
              <label className="form-field">
                <span>Formato de data</span>
                <select value={dateFormat} onChange={(event) => setDateFormat(event.target.value)}>
                  <option value="dd/MM/yyyy">08/10/2025</option>
                  <option value="MM/dd/yyyy">10/08/2025</option>
                </select>
              </label>
              <label className="form-field">
                <span>Tema</span>
                <select
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as typeof theme)}
                >
                  <option value="SYSTEM">Seguir sistema</option>
                  <option value="LIGHT">Claro</option>
                  <option value="DARK">Escuro</option>
                </select>
              </label>
            </div>
          )}
          {step === 3 && (
            <div className="onboarding-step">
              <h1>Adicione sua primeira conta</h1>
              <p>
                Pode ser uma conta corrente, carteira ou banco digital. O saldo inicial é apenas um
                ponto de partida.
              </p>
              <label className="form-field">
                <span>Nome da conta</span>
                <input
                  required
                  value={account.name}
                  onChange={(event) => setAccount({ ...account, name: event.target.value })}
                  placeholder="Ex.: Conta principal"
                />
              </label>
              <label className="form-field">
                <span>Tipo</span>
                <select
                  value={account.type}
                  onChange={(event) => setAccount({ ...account, type: event.target.value })}
                >
                  <option value="CHECKING">Conta corrente</option>
                  <option value="SAVINGS">Poupança</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="DIGITAL_WALLET">Carteira digital</option>
                  <option value="INVESTMENT">Investimentos</option>
                  <option value="OTHER">Outra</option>
                </select>
              </label>
              <label className="form-field">
                <span>Saldo inicial</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={account.initialBalance}
                  onChange={(event) =>
                    setAccount({ ...account, initialBalance: event.target.value })
                  }
                />
              </label>
            </div>
          )}
          {step === 4 && (
            <div className="onboarding-step">
              <h1>Escolha suas categorias</h1>
              <p>Sugerimos uma base enxuta. Você poderá personalizar depois.</p>
              <div className="category-picks">
                <strong>Despesas</strong>
                {suggestedExpense.map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={selected.includes(name)}
                      onChange={() =>
                        setSelected(
                          selected.includes(name)
                            ? selected.filter((item) => item !== name)
                            : [...selected, name],
                        )
                      }
                    />
                    {name}
                  </label>
                ))}
                <strong>Receitas</strong>
                {suggestedIncome.map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      checked={selected.includes(name)}
                      onChange={() =>
                        setSelected(
                          selected.includes(name)
                            ? selected.filter((item) => item !== name)
                            : [...selected, name],
                        )
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="onboarding-step onboarding-step--success">
              <span className="onboarding-icon onboarding-icon--success">
                <Check size={24} />
              </span>
              <h1>Seu espaço está pronto.</h1>
              <p>
                Conta, preferências e categorias estão preparadas. Agora você pode começar no seu
                ritmo.
              </p>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="onboarding-actions">
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={17} /> Voltar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : step === 5 ? 'Ir para visão geral' : 'Continuar'}
              {step < 5 && <ChevronRight size={17} />}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
