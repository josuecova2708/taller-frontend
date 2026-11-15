'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { hace } from '@/lib/format';
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/lib/types';
import { OrderStatusBadge, PriorityBadge } from '@/components/Badges';
import { Field, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel';

const ESTADOS: Array<{ valor: WorkOrderStatus | 'TODAS'; etiqueta: string }> = [
  { valor: 'TODAS', etiqueta: 'Todos' },
  { valor: 'OPEN', etiqueta: 'Abierta' },
  { valor: 'IN_PROGRESS', etiqueta: 'En proceso' },
  { valor: 'COMPLETED', etiqueta: 'Completada' },
  { valor: 'CANCELLED', etiqueta: 'Cancelada' },
];

const PRIORIDADES: Array<{ valor: WorkOrderPriority | 'TODAS'; etiqueta: string }> = [
  { valor: 'TODAS', etiqueta: 'Todas' },
  { valor: 'CRITICAL', etiqueta: 'Crítica' },
  { valor: 'HIGH', etiqueta: 'Alta' },
  { valor: 'MEDIUM', etiqueta: 'Media' },
  { valor: 'LOW', etiqueta: 'Baja' },
];

export default function WorkOrdersPage() {
  const [ordenes, setOrdenes] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState<WorkOrderStatus | 'TODAS'>('TODAS');
  const [prioridad, setPrioridad] = useState<WorkOrderPriority | 'TODAS'>('TODAS');

  useEffect(() => {
    api
      .get<WorkOrder[]>('/work-orders')
      .then(({ data }) => setOrdenes(data))
      .catch((err) =>
        setError(
          estadoHttp(err) === 403
            ? 'Su rol no tiene permiso para consultar órdenes de trabajo.'
            : mensajeDeError(err, 'No se pudieron cargar las órdenes de trabajo.'),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(
    () =>
      ordenes.filter(
        (o) =>
          (estado === 'TODAS' || o.status === estado) &&
          (prioridad === 'TODAS' || o.priority === prioridad),
      ),
    [ordenes, estado, prioridad],
  );

  const abiertas = ordenes.filter((o) =>
    ['OPEN', 'IN_PROGRESS'].includes(o.status),
  ).length;

  return (
    <div>
      <PageHeader
        title="Órdenes de trabajo"
        description="Se abren cuando un escaneo detecta una falla que debe revisar un mecánico."
      />

      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}

      {!loading && ordenes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          <Field label="Estado" className="w-40">
            {(id) => (
              <Select
                id={id}
                value={estado}
                onChange={(e) => setEstado(e.target.value as WorkOrderStatus | 'TODAS')}
              >
                {ESTADOS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prioridad" className="w-40">
            {(id) => (
              <Select
                id={id}
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as WorkOrderPriority | 'TODAS')}
              >
                {PRIORIDADES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <p className="ml-auto pb-2 text-sm text-ink-2">
            <span className="nums font-semibold text-ink">{abiertas}</span> sin cerrar de{' '}
            <span className="nums">{ordenes.length}</span>
          </p>
        </div>
      )}

      <Panel flush>
        {loading ? (
          <p className="p-5 text-sm text-ink-3">Cargando órdenes de trabajo…</p>
        ) : ordenes.length === 0 ? (
          <EmptyState title="No hay órdenes de trabajo">
            Se crean solas cuando un escaneo detecta una falla que requiere revisión.
          </EmptyState>
        ) : filtradas.length === 0 ? (
          <EmptyState title="Ninguna orden coincide con los filtros">
            Cambie el estado o la prioridad para ver más órdenes.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {filtradas.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/work-orders/${o.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-app"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <p className="min-w-0 text-sm">
                      <span className="code font-semibold text-ink">
                        {o.vehicle?.plate ?? 'Vehículo no disponible'}
                      </span>
                      {o.vehicle?.alias && (
                        <span className="ml-2 text-ink-2">{o.vehicle.alias}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={o.priority} />
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </div>

                  <p className="mt-1.5 line-clamp-2 max-w-[90ch] text-sm text-ink-2">
                    {o.description}
                  </p>

                  <p className="mt-1.5 text-xs text-ink-3">
                    {o.assignedTo ? (
                      <>Asignada a {o.assignedTo.name}</>
                    ) : (
                      <span className="font-medium text-ink-2">Sin mecánico asignado</span>
                    )}
                    {' · '}Creada {hace(o.createdAt)}
                    {o.diagnosis ? ' · Con hipótesis de IA' : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
