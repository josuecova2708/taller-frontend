const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Días completos transcurridos desde una fecha. */
export function diasDesde(fecha: string | Date, ahora: Date = new Date()): number {
  return Math.floor((ahora.getTime() - new Date(fecha).getTime()) / DIA);
}

/** "hace 2 horas", "ayer", "hace 12 días". */
export function hace(fecha: string | Date, ahora: Date = new Date()): string {
  const ms = ahora.getTime() - new Date(fecha).getTime();

  if (ms < MINUTO) return 'hace un momento';
  if (ms < HORA) {
    const m = Math.floor(ms / MINUTO);
    return `hace ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  }
  if (ms < DIA) {
    const h = Math.floor(ms / HORA);
    return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  }
  const d = Math.floor(ms / DIA);
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

const formatoFecha = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatoFechaHora = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function fecha(valor: string | Date): string {
  return formatoFecha.format(new Date(valor));
}

export function fechaHora(valor: string | Date): string {
  return formatoFechaHora.format(new Date(valor));
}

/** "Toyota Hilux 2021", omitiendo lo que falte. */
export function descripcionVehiculo(v: {
  make?: string | null;
  model?: string | null;
  year?: number | null;
}): string {
  return [v.make, v.model, v.year].filter(Boolean).join(' ');
}
