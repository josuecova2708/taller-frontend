import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconBack } from './icons';

interface PanelProps {
  title?: string;
  /** Enlace o botón alineado a la derecha del título. */
  action?: ReactNode;
  children: ReactNode;
  /** Sin relleno interno: para tablas y listas que llegan hasta el borde. */
  flush?: boolean;
  className?: string;
}

/**
 * Superficie blanca delimitada por un borde fino. Sin sombra: sobre un fondo
 * tan claro, el borde alcanza para separar y la página queda más limpia.
 */
export function Panel({ title, action, children, flush = false, className = '' }: PanelProps) {
  return (
    <section className={`rounded-panel border border-line bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && (
          <p className="mt-1 max-w-[70ch] text-sm text-ink-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Enlace de regreso al listado, sobre el título de una página de detalle. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 rounded-control text-sm font-medium text-ink-2 hover:text-navy"
    >
      <IconBack width={16} height={16} />
      {children}
    </Link>
  );
}

/** Un dato con su rótulo, para las fichas de detalle. */
export function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  /** Qué puede hacer la persona a continuación. */
  children?: ReactNode;
}

/** Pantalla o lista vacía: dice qué pasa y, si corresponde, qué hacer. */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
    </div>
  );
}
