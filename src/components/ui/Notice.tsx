import type { ReactNode } from 'react';
import { IconAlert, IconCheck, IconInfo } from './icons';

type Tono = 'error' | 'success' | 'warning' | 'info';

const ESTILOS: Record<Tono, { caja: string; icono: ReactNode }> = {
  error: {
    caja: 'border-danger/30 bg-danger-soft text-danger',
    icono: <IconAlert />,
  },
  success: {
    caja: 'border-ok/30 bg-ok-soft text-ok',
    icono: <IconCheck />,
  },
  warning: {
    caja: 'border-warn/30 bg-warn-soft text-warn',
    icono: <IconAlert />,
  },
  info: {
    caja: 'border-navy/20 bg-navy-soft text-navy',
    icono: <IconInfo />,
  },
};

interface NoticeProps {
  tone?: Tono;
  children: ReactNode;
  className?: string;
}

/**
 * Mensaje del sistema dentro de la página. Los errores se anuncian a los
 * lectores de pantalla de inmediato; el resto, sin interrumpir.
 */
export function Notice({ tone = 'info', children, className = '' }: NoticeProps) {
  const estilo = ESTILOS[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-sm ${estilo.caja} ${className}`}
    >
      <span className="mt-px shrink-0">{estilo.icono}</span>
      <div className="min-w-0 text-ink">{children}</div>
    </div>
  );
}
