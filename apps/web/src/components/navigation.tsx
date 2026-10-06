import { useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  Settings,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import { branding } from '../lib/branding';
import { IconButton, SearchInput } from './ui';
import { useTheme, type ThemeMode } from '../hooks/useTheme';

const mainItems = [
  ['Visão geral', LayoutDashboard],
  ['Transações', ReceiptText],
  ['Contas', WalletCards],
  ['Cartões', CreditCard],
  ['Orçamentos', PiggyBank],
  ['Metas', Target],
  ['Assinaturas', ReceiptText],
  ['Calendário', CalendarDays],
  ['Relatórios', BarChart3],
] as const;

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggle,
  onLogout,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Navegação principal"
    >
      <div className="sidebar__brand">
        <span className="brand-mark">F</span>
        {!collapsed && <span className="brand-name">{branding.name}</span>}
        <IconButton
          label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          onClick={onToggle}
          className="sidebar__toggle"
        >
          <ChevronLeft size={17} />
        </IconButton>
      </div>
      <nav className="sidebar__nav">
        {mainItems.map(([label, Icon]) => (
          <button
            key={label}
            className={`nav-item ${activePage === label ? 'nav-item--active' : ''}`}
            onClick={() => onNavigate(label)}
            aria-current={activePage === label ? 'page' : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button
          className="nav-item"
          title={collapsed ? 'Configurações' : undefined}
          onClick={() => onNavigate('Configurações')}
        >
          <Settings size={18} aria-hidden="true" />
          {!collapsed && <span>Configurações</span>}
        </button>
        <button className="nav-item" title={collapsed ? 'Ajuda' : undefined}>
          <CircleHelp size={18} aria-hidden="true" />
          {!collapsed && <span>Ajuda</span>}
        </button>
        <button className="nav-item" title={collapsed ? 'Sair' : undefined} onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Sair</span>}
        </button>
        {!collapsed && (
          <div className="profile-card">
            <span className="avatar">MC</span>
            <span>
              <strong>Marina Costa</strong>
              <small>Conta pessoal</small>
            </span>
            <MoreHorizontal size={17} />
          </div>
        )}
      </div>
    </aside>
  );
}
export function Header({
  onQuickAction,
  onMenu,
}: {
  onQuickAction: () => void;
  onMenu: () => void;
}) {
  const { mode, setMode } = useTheme();
  return (
    <header className="topbar">
      <div className="topbar__context">
        <IconButton label="Abrir navegação" className="mobile-only" onClick={onMenu}>
          <Menu size={20} />
        </IconButton>
        <div>
          <span className="topbar__kicker">Finora · espaço pessoal</span>
          <strong>Visão geral</strong>
        </div>
      </div>
      <div className="topbar__actions">
        <SearchInput placeholder="Pesquisar no Finora" />
        <button className="topbar__quick-action" onClick={onQuickAction}>
          <span>+</span> Adicionar
        </button>
        <IconButton label="Notificações">
          <Bell size={19} />
        </IconButton>
        <select
          aria-label="Tema"
          className="theme-select"
          value={mode}
          onChange={(event) => setMode(event.target.value as ThemeMode)}
        >
          <option value="system">Sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
        <span className="avatar avatar--top">MC</span>
      </div>
    </header>
  );
}
export function MobileNavigation({
  activePage,
  onNavigate,
  onQuickAction,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
  onQuickAction: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const items = [
    ['Visão geral', LayoutDashboard],
    ['Transações', ReceiptText],
    ['Adicionar', null],
    ['Orçamentos', PiggyBank],
    ['Mais', MoreHorizontal],
  ] as const;
  return (
    <>
      <nav className="mobile-navigation" aria-label="Navegação mobile">
        {items.map(([label, Icon]) =>
          label === 'Adicionar' ? (
            <button
              key={label}
              className="mobile-nav__add"
              onClick={onQuickAction}
              aria-label="Adicionar lançamento"
            >
              <span>+</span>
              <small>Adicionar</small>
            </button>
          ) : (
            <button
              key={label}
              className={`mobile-nav__item ${activePage === label ? 'mobile-nav__item--active' : ''}`}
              onClick={() => (label === 'Mais' ? setMoreOpen(!moreOpen) : onNavigate(label))}
            >
              {Icon && <Icon size={19} aria-hidden="true" />}
              <small>{label}</small>
            </button>
          ),
        )}
      </nav>
      {moreOpen && (
        <div className="mobile-more" role="menu">
          <button role="menuitem" onClick={() => onNavigate('Cartões')}>
            Cartões
          </button>
          <button role="menuitem" onClick={() => onNavigate('Calendário')}>
            Calendário
          </button>
          <button role="menuitem" onClick={() => onNavigate('Relatórios')}>
            Relatórios
          </button>
        </div>
      )}
    </>
  );
}
export function MobileMenu({
  open,
  onClose,
  activePage,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-menu__header">
          <span className="brand-name">{branding.name}</span>
          <IconButton label="Fechar navegação" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        <nav>
          {mainItems.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? 'nav-item--active' : ''}`}
              onClick={() => {
                onNavigate(label);
                onClose();
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
