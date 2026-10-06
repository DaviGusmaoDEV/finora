import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { WalletCards } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AppShell } from './layouts/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { PersonalOverviewPage } from './pages/PersonalOverviewPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { OnboardingPage } from './pages/OnboardingPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { Button, Card, EmptyState } from './components/ui';
import { branding } from './lib/branding';

const routes: Record<string, string> = {
  'Visão geral': '/visao-geral',
  Transações: '/transacoes',
  Contas: '/contas',
  Cartões: '/cartoes',
  Orçamentos: '/orcamentos',
  Metas: '/metas',
  Assinaturas: '/assinaturas',
  Calendário: '/calendario',
  Relatórios: '/relatorios',
  Configurações: '/configuracoes',
};
const labels: Record<string, string> = Object.fromEntries(
  Object.entries(routes).map(([label, path]) => [path, label]),
);
function PrivateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = labels[location.pathname] || 'Visão geral';
  return (
    <AppShell
      activePage={activePage}
      onNavigate={(page) => navigate(routes[page] || '/visao-geral')}
    >
      <Outlet />
    </AppShell>
  );
}
function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="route-loading">Carregando seu espaço…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.preference?.onboardingCompleted && location.pathname !== '/onboarding')
    return <Navigate to="/onboarding" replace />;
  if (user.preference?.onboardingCompleted && location.pathname === '/onboarding')
    return <Navigate to="/visao-geral" replace />;
  return <Outlet />;
}
function LandingPage() {
  return (
    <main className="landing-page">
      <div className="auth-brand">
        <span className="brand-mark">F</span>
        <span className="brand-name">{branding.name}</span>
      </div>
      <Card className="landing-card">
        <span className="eyebrow">{branding.descriptor}</span>
        <h1>Organize seu dinheiro com mais clareza.</h1>
        <p>
          Um espaço pessoal, calmo e seguro para construir uma relação melhor com suas decisões
          financeiras.
        </p>
        <div className="landing-actions">
          <Button
            onClick={() => {
              window.location.href = '/cadastro';
            }}
          >
            Criar minha conta
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            Entrar
          </Button>
        </div>
      </Card>
    </main>
  );
}
function DemoPage() {
  return (
    <AppShell activePage="Visão geral" onNavigate={() => undefined}>
      <OverviewPage />
    </AppShell>
  );
}
function PlaceholderPage() {
  return (
    <Card>
      <EmptyState
        icon={<WalletCards />}
        title="Esta área está sendo preparada"
        description="A próxima fase do Finora vai trazer essa funcionalidade para dados reais."
      />
    </Card>
  );
}
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<PrivateLayout />}>
            <Route path="/visao-geral" element={<PersonalOverviewPage />} />
            <Route path="/contas" element={<AccountsPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/transacoes" element={<TransactionsPage />} />
            <Route path="/cartoes" element={<PlaceholderPage />} />
            <Route path="/orcamentos" element={<PlaceholderPage />} />
            <Route path="/metas" element={<PlaceholderPage />} />
            <Route path="/assinaturas" element={<PlaceholderPage />} />
            <Route path="/calendario" element={<PlaceholderPage />} />
            <Route path="/relatorios" element={<PlaceholderPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
