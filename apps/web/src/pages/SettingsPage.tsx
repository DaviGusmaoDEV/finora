import { useState, type FormEvent } from 'react';
import { Button, Card } from '../components/ui';
import { apiFetch } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [theme, setTheme] = useState(user?.preference?.theme || 'SYSTEM');
  const [currency, setCurrency] = useState(user?.preference?.currency || 'BRL');
  const [locale, setLocale] = useState(user?.preference?.locale || 'pt-BR');
  const [dateFormat, setDateFormat] = useState(user?.preference?.dateFormat || 'dd/MM/yyyy');
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await apiFetch('/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
    await apiFetch('/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ theme, currency, locale, dateFormat }),
    });
    localStorage.setItem('finora-theme', theme.toLowerCase());
    document.documentElement.dataset.theme =
      theme === 'SYSTEM'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme.toLowerCase();
    await refresh();
    setMessage('Preferências salvas.');
  };
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Seu espaço</p>
          <h1>Configurações</h1>
          <p className="page-header__description">
            Ajuste o Finora para acompanhar seu jeito de organizar a vida financeira.
          </p>
        </div>
      </div>
      <Card className="settings-card">
        <form className="settings-form" onSubmit={submit}>
          <h2>Perfil</h2>
          <label className="form-field">
            <span>Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-field">
            <span>E-mail</span>
            <input value={user?.email || ''} disabled />
          </label>
          <h2>Preferências</h2>
          <label className="form-field">
            <span>Moeda</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="BRL">BRL — Real brasileiro</option>
              <option value="USD">USD — Dólar americano</option>
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
              <option value="dd/MM/yyyy">dd/MM/yyyy</option>
              <option value="MM/dd/yyyy">MM/dd/yyyy</option>
            </select>
          </label>
          <label className="form-field">
            <span>Aparência</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as typeof theme)}
            >
              <option value="SYSTEM">Seguir sistema</option>
              <option value="LIGHT">Claro</option>
              <option value="DARK">Escuro</option>
            </select>
          </label>
          <div className="settings-actions">
            <Button type="submit">Salvar alterações</Button>
            {message && (
              <span className="success-message" role="status">
                {message}
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
