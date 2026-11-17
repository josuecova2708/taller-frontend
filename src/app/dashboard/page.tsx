'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { descripcionVehiculo, diasDesde, hace } from '@/lib/format';
import {
  dictamenDe,
  type FleetVehicle,
  type Scan,
  type VehicleStatus,
  type WorkOrder,
} from '@/lib/types';
import { ESTADO_VEHICULO, PriorityBadge, SeverityBadge } from '@/components/Badges';
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel';
import { Notice } from '@/components/ui/Notice';
import { IconAlert, IconClock, IconOrder } from '@/components/ui/icons';

/**
 * Días sin escaneo a partir de los cuales un vehículo se considera atrasado.
 * El sistema es de escaneos PERIÓDICOS: un vehículo que nadie escanea no está
 * "operativo", simplemente no se sabe cómo está.
 */
const DIAS_SIN_ESCANEO = 30;

/** Lo más grave primero: así el orden de la franja ya cuenta la historia. */
const ORDEN_ESTADO: VehicleStatus[] = ['CRITICAL', 'ALERT', 'OK'];

const CELDA: Record<VehicleStatus, string> = {
  OK: 'border-l-ok bg-ok-soft/50 hover:bg-ok-soft',
  ALERT: 'border-l-warn bg-warn-soft/60 hover:bg-warn-soft',
  CRITICAL: 'border-l-danger bg-danger-soft/70 hover:bg-danger-soft',
};

/** Texto de la leyenda, concordando en número con la cantidad. */
const LEYENDA: Record<VehicleStatus, (n: number) => string> = {
  OK: (n) => (n === 1 ? 'operativo' : 'operativos'),
  ALERT: () => 'en seguimiento',
  CRITICAL: (n) => (n === 1 ? 'requiere evaluación' : 'requieren evaluación'),
};

/** Sin escaneo reciente (o sin ninguno): su estado ya no es confiable. */
function escaneoAtrasado(v: FleetVehicle): boolean {
  const ultimo = v.scans?.[0];
  return !ultimo || diasDesde(ultimo.scannedAt) >= DIAS_SIN_ESCANEO;
}

interface Pendiente {
  id: string;
  href: string;
  icono: ReactNode;
  tono: string;
  titulo: ReactNode;
  detalle: string;
  extra?: ReactNode;
}

export default function DashboardPage() {
  const { loading: authLoading, can } = useAuth();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canSeeOrders = can(Permission.ORDER_READ);

  useEffect(() => {
    // Esperar a que se resuelvan los permisos para no pedir endpoints que el
    // rol no puede leer (devolverían 403).
    if (authLoading) return;

    let cancelled = false;

    // Un fallo de permisos o de red se muestra como error, no como "0 vehículos".
    Promise.all([
      api.get<FleetVehicle[]>('/vehicles'),
      api.get<Scan[]>('/scans'),
      canSeeOrders
        ? api.get<WorkOrder[]>('/work-orders')
        : Promise.resolve({ data: [] as WorkOrder[] }),
    ])
      .then(([vRes, sRes, wRes]) => {
        if (cancelled) return;
        setVehicles(vRes.data ?? []);
        setScans(sRes.data ?? []);
        setWorkOrders(wRes.data ?? []);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          estadoHttp(err) === 403
            ? 'Su rol no tiene permiso para consultar estos datos.'
            : mensajeDeError(err, 'No se pudo cargar el estado de la flota.'),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, canSeeOrders]);

  const flota = useMemo(
    () =>
      [...vehicles].sort(
        (a, b) =>
          ORDEN_ESTADO.indexOf(a.status) - ORDEN_ESTADO.indexOf(b.status) ||
          a.plate.localeCompare(b.plate),
      ),
    [vehicles],
  );

  const conteo = useMemo(() => {
    const c: Record<VehicleStatus, number> = { OK: 0, ALERT: 0, CRITICAL: 0 };
    for (const v of vehicles) c[v.status] += 1;
    return c;
  }, [vehicles]);

  const ordenesAbiertas = workOrders.filter(
    (o) => o.status === 'OPEN' || o.status === 'IN_PROGRESS',
  );

  const pendientes = useMemo<Pendiente[]>(() => {
    const lista: Pendiente[] = [];

    for (const v of flota.filter((x) => x.status === 'CRITICAL')) {
      const ultimo = v.scans?.[0];
      const codigos = ultimo?.dtcEntries.map((d) => d.code).join(', ');
      lista.push({
        id: `eval-${v.id}`,
        href: ultimo ? `/dashboard/scans/${ultimo.id}` : '/dashboard/vehicles',
        icono: <IconAlert />,
        tono: 'text-danger',
        titulo: (
          <>
            <span className="code">{v.plate}</span> requiere evaluación
          </>
        ),
        detalle:
          (codigos ? `Códigos ${codigos}. ` : '') +
          (ultimo ? (dictamenDe(ultimo) ?? '') : 'Sin escaneos registrados.'),
      });
    }

    for (const o of ordenesAbiertas.filter((x) => !x.assignedTo)) {
      lista.push({
        id: `orden-${o.id}`,
        href: `/dashboard/work-orders/${o.id}`,
        icono: <IconOrder />,
        tono: 'text-navy',
        titulo: (
          <>
            Orden sin mecánico asignado
            {o.vehicle ? (
              <>
                {' '}
                para <span className="code">{o.vehicle.plate}</span>
              </>
            ) : null}
          </>
        ),
        detalle: `Abierta ${hace(o.createdAt)}.`,
        extra: <PriorityBadge priority={o.priority} />,
      });
    }

    for (const v of flota) {
      if (!escaneoAtrasado(v)) continue;
      const ultimo = v.scans?.[0];
      const dias = ultimo ? diasDesde(ultimo.scannedAt) : null;
      lista.push({
        id: `atraso-${v.id}`,
        href: `/dashboard/vehicles/${v.id}`,
        icono: <IconClock />,
        tono: 'text-warn',
        titulo: (
          <>
            <span className="code">{v.plate}</span>{' '}
            {dias === null ? 'nunca fue escaneado' : `lleva ${dias} días sin escaneo`}
          </>
        ),
        detalle:
          (v.responsible ? `Responsable: ${v.responsible.name}. ` : 'Sin responsable. ') +
          `El escaneo periódico se espera al menos cada ${DIAS_SIN_ESCANEO} días.`,
      });
    }

    return lista;
  }, [flota, ordenesAbiertas]);

  return (
    <div>
      <PageHeader
        title="Flota"
        description="Estado del parque automotor según el último escaneo de cada vehículo."
      />

      {error && (
        <Notice tone="error" className="mb-6">
          {error}
        </Notice>
      )}

      {/* La flota, vehículo por vehículo. */}
      <Panel className="mb-6">
        {loading ? (
          <p className="text-sm text-ink-3">Cargando la flota…</p>
        ) : flota.length === 0 ? (
          <EmptyState title="Todavía no hay vehículos registrados">
            {can(Permission.VEHICLE_WRITE) ? (
              <Link href="/dashboard/vehicles" className="font-medium text-navy underline">
                Registrar el primer vehículo
              </Link>
            ) : (
              'El administrador debe registrar los vehículos de la flota.'
            )}
          </EmptyState>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
              <p className="text-sm text-ink-2">
                <span className="nums text-3xl font-semibold text-navy">{flota.length}</span>{' '}
                {flota.length === 1 ? 'vehículo' : 'vehículos'}
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
                {(['OK', 'ALERT', 'CRITICAL'] as VehicleStatus[]).map((estado) => (
                  <li key={estado} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${ESTADO_VEHICULO[estado].punto}`}
                      aria-hidden="true"
                    />
                    <span className="nums font-semibold text-ink">{conteo[estado]}</span>
                    {LEYENDA[estado](conteo[estado])}
                  </li>
                ))}
              </ul>
            </div>

            <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
              {flota.map((v) => {
                const ultimo = v.scans?.[0];
                const atrasado = escaneoAtrasado(v);
                return (
                  <li key={v.id}>
                    <Link
                      href={ultimo ? `/dashboard/scans/${ultimo.id}` : '/dashboard/vehicles'}
                      title={
                        `${v.plate}: ${ESTADO_VEHICULO[v.status].label}` +
                        (atrasado ? ' (escaneo atrasado)' : '')
                      }
                      className={`block rounded-control border-l-4 px-3 py-2 transition-colors ${CELDA[v.status]}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="code text-sm font-semibold text-ink">{v.plate}</span>
                        {/* Un vehículo sin escaneo reciente no está "bien":
                            simplemente no se sabe cómo está. */}
                        {atrasado && (
                          <IconClock width={14} height={14} className="shrink-0 text-warn" />
                        )}
                      </span>
                      <span className="block truncate text-xs text-ink-2">
                        {v.alias || descripcionVehiculo(v) || 'Sin descripción'}
                      </span>
                      <span className="sr-only">
                        {ESTADO_VEHICULO[v.status].label}
                        {atrasado ? ', escaneo atrasado' : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Panel title="Requiere atención" flush className="lg:col-span-3">
          {loading ? (
            <p className="p-5 text-sm text-ink-3">Cargando…</p>
          ) : pendientes.length === 0 ? (
            <EmptyState title="No hay nada pendiente">
              Toda la flota está al día con sus escaneos y sin fallas por evaluar.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {pendientes.map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-app"
                  >
                    <span className={`mt-0.5 shrink-0 ${p.tono}`}>{p.icono}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{p.titulo}</span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-ink-2">
                        {p.detalle}
                      </span>
                    </span>
                    {p.extra && <span className="shrink-0">{p.extra}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Últimos escaneos"
          flush
          className="lg:col-span-2"
          action={
            <Link
              href="/dashboard/scans"
              className="text-sm font-medium text-navy hover:underline"
            >
              Ver historial
            </Link>
          }
        >
          {loading ? (
            <p className="p-5 text-sm text-ink-3">Cargando…</p>
          ) : scans.length === 0 ? (
            <EmptyState title="Aún no se registró ningún escaneo">
              Los escaneos se envían desde la aplicación móvil.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {scans.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/scans/${s.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-app"
                  >
                    <span className="min-w-0">
                      <span className="code block text-sm font-semibold text-ink">
                        {s.vehicle?.plate}
                      </span>
                      <span className="block text-xs text-ink-3">{hace(s.scannedAt)}</span>
                    </span>
                    <SeverityBadge severity={s.severity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {!loading && !error && (
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <div>
            <dt className="text-ink-3">Escaneos registrados</dt>
            <dd className="nums text-lg font-semibold text-ink">{scans.length}</dd>
          </div>
          {canSeeOrders && (
            <div>
              <dt className="text-ink-3">Órdenes de trabajo abiertas</dt>
              <dd className="nums text-lg font-semibold text-ink">{ordenesAbiertas.length}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
