import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/** Aspecto común de los controles de formulario. */
export const controlClass =
  'block w-full rounded-control border border-line-strong bg-surface px-3 py-2 ' +
  'text-sm text-ink placeholder:text-ink-3 ' +
  'focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 ' +
  'disabled:bg-app disabled:text-ink-3';

interface FieldProps {
  label: string;
  /** Ayuda breve bajo el control. */
  hint?: string;
  error?: string;
  /** Recibe el `id` que enlaza la etiqueta con el control. */
  children: (id: string) => ReactNode;
  className?: string;
}

/** Etiqueta + control + ayuda o error, enlazados para lectores de pantalla. */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} ${className}`} {...props} />;
}
