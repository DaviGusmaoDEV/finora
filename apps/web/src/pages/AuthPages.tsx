import { useState, type FormEvent, type ReactNode } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { branding } from '../lib/branding';
import { useAuth } from '../auth/AuthProvider';

function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">F</span>
        <span className="brand-name">{branding.name}</span>
      </div>
      <Card className="auth-card">
        <span className="eyebrow">{branding.descriptor}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </Card>
      <span className="auth-security">
        <ShieldCheck size={15} /> Seus dados ficam protegidos por sessão segura
      </span>
    </main>
  );
}
function PasswordInput({
  value,
  onChange,
  autoComplete,
  label = 'Senha',
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="form-field">
      <span>{label}</span>
      <div className="password-field">
        <input
          required
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={8}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from || '/visao-geral');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title="Que bom ter você aqui."
      description="Entre para acompanhar seu espaço financeiro com tranquilidade."
    >
      <form className="auth-form" onSubmit={submit}>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <label className="form-field">
          <span>E-mail</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="auth-switch">
          Ainda não tem uma conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(name, email, password);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar sua conta.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title="Comece com calma."
      description="Crie seu espaço pessoal e organize suas decisões financeiras."
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
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="form-field">
          <span>E-mail</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          label="Crie uma senha (mínimo de 8 caracteres)"
        />
        <Button type="submit" disabled={busy}>
          {busy ? 'Criando…' : 'Criar minha conta'}
        </Button>
        <p className="auth-switch">
          Já possui uma conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
