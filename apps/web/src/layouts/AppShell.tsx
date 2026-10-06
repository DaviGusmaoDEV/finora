import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '../components/ui';
import { Header, MobileMenu, MobileNavigation, Sidebar } from '../components/navigation';
import { useAuth } from '../auth/AuthProvider';

export function AppShell({
  children,
  activePage,
  onNavigate,
}: {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickAction, setQuickAction] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onLogout={() => {
          void logout().then(() => {
            window.location.href = '/login';
          });
        }}
      />
      <div className="app-main">
        <Header onQuickAction={() => setQuickAction(true)} onMenu={() => setMobileMenu(true)} />
        <main className="app-content">{children}</main>
      </div>
      <MobileNavigation
        activePage={activePage}
        onNavigate={onNavigate}
        onQuickAction={() => setQuickAction(true)}
      />
      <MobileMenu
        open={mobileMenu}
        onClose={() => setMobileMenu(false)}
        activePage={activePage}
        onNavigate={onNavigate}
      />
      <Modal open={quickAction} title="Ação rápida" onClose={() => setQuickAction(false)}>
        <p className="modal__description">Registre uma movimentação em poucos passos.</p>
        <div className="quick-action-list">
          <Button
            onClick={() => {
              setQuickAction(false);
              navigate('/transacoes?new=expense');
            }}
          >
            Nova despesa
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setQuickAction(false);
              navigate('/transacoes?new=income');
            }}
          >
            Nova receita
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setQuickAction(false);
              navigate('/transacoes?new=transfer');
            }}
          >
            <Plus size={17} /> Transferência
          </Button>
        </div>
      </Modal>
    </div>
  );
}
