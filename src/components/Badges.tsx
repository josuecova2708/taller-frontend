import type {
  DtcType,
  ScanSeverity,
  VehicleStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@/lib/types';

/**
 * Etiquetas de estado.
 *
 * Usan solo los tres colores de estado (más neutro y azul de marca para lo
 * que no es bueno ni malo). La intensidad sube con la gravedad: suave para lo
 * que hay que mirar, sólido para lo que no puede esperar.
 */
const base =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold';

const TONO = {
  neutro: 'bg-line/70 text-ink-2',
  ok: 'bg-ok-soft text-ok',
  aviso: 'bg-warn-soft text-warn',
  grave: 'bg-danger-soft text-danger',
  critico: 'bg-danger text-white',
  marca: 'bg-navy-soft text-navy',
  marcaSolida: 'bg-navy text-white',
} as const;

/** Textos del estado del vehículo, en un solo lugar para toda la web. */
export const ESTADO_VEHICULO: Record<
  VehicleStatus,
  { label: string; punto: string; tono: string }
> = {
  OK: { label: 'Operativo', punto: 'bg-ok', tono: TONO.ok },
  ALERT: { label: 'En seguimiento', punto: 'bg-warn', tono: TONO.aviso },
  CRITICAL: { label: 'Requiere evaluación', punto: 'bg-danger', tono: TONO.grave },
};

/** Textos de la severidad de un escaneo, en un solo lugar para toda la web. */
export const SEVERIDAD: Record<ScanSeverity, { cls: string; label: string }> = {
  NONE: { cls: TONO.ok, label: 'Sin fallas' },
  LOW: { cls: TONO.neutro, label: 'Leve' },
  MEDIUM: { cls: TONO.aviso, label: 'Media' },
  HIGH: { cls: TONO.grave, label: 'Alta' },
  CRITICAL: { cls: TONO.critico, label: 'Crítica' },
};

export function SeverityBadge({ severity }: { severity: ScanSeverity }) {
  const item = SEVERIDAD[severity] ?? SEVERIDAD.NONE;
  return <span className={`${base} ${item.cls}`}>{item.label}</span>;
}

/** Etiqueta neutra o de marca para datos que no son un estado de gravedad. */
export function Tag({
  tone = 'neutro',
  children,
}: {
  tone?: 'neutro' | 'marca';
  children: React.ReactNode;
}) {
  return <span className={`${base} ${TONO[tone]}`}>{children}</span>;
}

/** Estado del vehículo: punto de color más texto, nunca solo el color. */
export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const item = ESTADO_VEHICULO[status] ?? ESTADO_VEHICULO.OK;
  return (
    <span className={`${base} ${item.tono}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${item.punto}`} aria-hidden="true" />
      {item.label}
    </span>
  );
}

/**
 * Tipo de código de falla. El modo OBD-II con que se leyó queda como ayuda al
 * pasar el cursor: al mecánico le sirve, pero no hace falta en cada fila.
 */
export function DtcTypeBadge({ type }: { type: DtcType }) {
  const map: Record<DtcType, { cls: string; label: string; ayuda: string }> = {
    CONFIRMED: {
      cls: TONO.grave,
      label: 'Confirmado',
      ayuda: 'Falla activa confirmada por la computadora del vehículo (Modo 03)',
    },
    PENDING: {
      cls: TONO.aviso,
      label: 'Pendiente',
      ayuda: 'Detectado en un ciclo de conducción, aún sin confirmar (Modo 07)',
    },
    PERMANENT: {
      cls: TONO.marca,
      label: 'Permanente',
      ayuda: 'Queda registrado hasta que el vehículo verifique la reparación (Modo 0A)',
    },
  };
  const item = map[type];
  return (
    <span className={`${base} ${item.cls}`} title={item.ayuda}>
      {item.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const map: Record<WorkOrderStatus, { cls: string; label: string }> = {
    OPEN: { cls: TONO.marca, label: 'Abierta' },
    IN_PROGRESS: { cls: TONO.marcaSolida, label: 'En proceso' },
    COMPLETED: { cls: TONO.ok, label: 'Completada' },
    CANCELLED: { cls: TONO.neutro, label: 'Cancelada' },
  };
  const item = map[status] ?? map.OPEN;
  return <span className={`${base} ${item.cls}`}>{item.label}</span>;
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const map: Record<WorkOrderPriority, { cls: string; label: string }> = {
    LOW: { cls: TONO.neutro, label: 'Prioridad baja' },
    MEDIUM: { cls: TONO.aviso, label: 'Prioridad media' },
    HIGH: { cls: TONO.grave, label: 'Prioridad alta' },
    CRITICAL: { cls: TONO.critico, label: 'Prioridad crítica' },
  };
  const item = map[priority] ?? map.MEDIUM;
  return <span className={`${base} ${item.cls}`}>{item.label}</span>;
}

/** Confianza que el modelo asignó a una causa probable. */
export function ConfidenceBadge({
  confidence,
}: {
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
}) {
  const map = {
    ALTA: { cls: TONO.marcaSolida, label: 'Confianza alta' },
    MEDIA: { cls: TONO.marca, label: 'Confianza media' },
    BAJA: { cls: TONO.neutro, label: 'Confianza baja' },
  };
  const item = map[confidence];
  return <span className={`${base} ${item.cls}`}>{item.label}</span>;
}
