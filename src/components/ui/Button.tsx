import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primary' | 'secondary' | 'danger' | 'quiet';
type Tamano = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTES: Record<Variante, string> = {
  // La acción principal de la pantalla. Azul marino, no rojo: el rojo queda
  // reservado para estados y acciones destructivas.
  primary: 'bg-navy text-white hover:bg-navy-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-app',
  danger: 'border border-danger/40 bg-surface text-danger hover:bg-danger-soft',
  quiet: 'text-ink-2 hover:bg-navy-soft hover:text-navy',
};

const TAMANOS: Record<Tamano, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

/** Clases de botón, para aplicarlas también a enlaces (`<Link>`). */
export function buttonClass(
  variante: Variante = 'primary',
  tamano: Tamano = 'md',
  extra = '',
): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamano;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props} />
  );
}
