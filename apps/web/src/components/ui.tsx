import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Search, X } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} {...props}>
      {children}
    </button>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function FinancialCard({
  label,
  value,
  comparison,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  comparison: string;
  tone?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
}) {
  return (
    <Card className="financial-card">
      <div className="financial-card__top">
        <span className="financial-card__label">{label}</span>
        <span className="financial-card__icon">{icon}</span>
      </div>
      <strong className="financial-card__value">{value}</strong>
      <span className={`financial-card__comparison financial-card__comparison--${tone}`}>
        {comparison}
      </span>
    </Card>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
export function SearchInput({
  placeholder = 'Pesquisar',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="search-input">
      <Search size={17} aria-hidden="true" />
      <input type="search" placeholder={placeholder} aria-label={placeholder} {...props} />
      <kbd>⌘ K</kbd>
    </label>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="select" {...props}>
      {children}
    </select>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) {
  return (
    <div className={`alert alert--${tone}`} role="status">
      {children}
    </div>
  );
}
export function Toast({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) {
  return (
    <div className={`toast toast--${tone}`} role="status">
      {children}
    </div>
  );
}
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="tooltip" data-tooltip={label}>
      {children}
    </span>
  );
}
export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="dropdown">
      <summary>{label}</summary>
      <div className="dropdown__menu">{children}</div>
    </details>
  );
}
export function Skeleton({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height }} />;
}
export function Avatar({ initials, label }: { initials: string; label?: string }) {
  return (
    <span className="avatar" aria-label={label}>
      {initials}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
