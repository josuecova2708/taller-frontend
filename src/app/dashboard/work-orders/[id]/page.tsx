'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { fechaHora } from '@/lib/format';
import type { VehicleStatus, WorkOrder } from '@/lib/types';
import {
  DtcTypeBadge,
  ESTADO_VEHICULO,
  OrderStatusBadge,
  PriorityBadge,
  VehicleStatusBadge,
} from '@/components/Badges';
import { Hipotesis } from '@/components/Hipotesis';
import { ReportButton } from '@/components/ReportButton';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { BackLink, Dato, Panel } from '@/components/ui/Panel';

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  active?: boolean;
}

const ESTADOS_ABIERTOS = ['OPEN', 'IN_PROGRESS'];

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { can, user } = useAuth();

  const [orden, setOrden] = useState<WorkOrder | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const [notas, setNotas] = useState('');
  const [resolucion, setResolucion] = useState('');
  const [cierreTipo, setCierreTipo] = useState<'COMPLETED' | 'CANCELLED'>('COMPLETED');
  const [autorizar, setAutorizar] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);

  const pedir = useCallback(
    () => api.get<WorkOrder>(`/work-orders/${orderId}`),
    [orderId],
  );

  const cargar = async () => {
    const { data } = await pedir();
    setOrden(data);
  };

  useEffect(() => {
    pedir()
      .then(({ data }) => setOrden(data))
      .catch((err) => {
        const estado = estadoHttp(err);
        setError(
          estado === 404
            ? 'Esta orden de trabajo no existe.'
            : estado === 403
              ? 'Su rol no tiene permiso para ver órdenes de trabajo.'
              : mensajeDeError(err, 'No se pudo cargar la orden de trabajo.'),
        );
      })
      .finally(() => setLoading(false));
  }, [pedir]);

  // La lista de usuarios solo es visible con `user:manage`; si el rol no lo
  // tiene, simplemente no se ofrece la asignación.
  useEffect(() => {
    if (!can(Permission.USER_MANAGE)) return;
    api
      .get<Usuario[]>('/auth/users')
      // Una orden solo se asigna a mecánicos con la cuenta activa.
      .then(({ data }) =>
        setUsuarios(data.filter((u) => u.role === 'MECHANIC' && u.active !== false)),
      )
      .catch(() => setUsuarios([]));
  }, [can]);

  const ejecutar = async (accion: () => Promise<string>) => {
    setTrabajando(true);
    setError('');
    setAviso('');
    try {
      setAviso(await accion());
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error && !estadoHttp(err) && !('isAxiosError' in err)
          ? err.message
          : mensajeDeError(err, 'No se pudo completar la operación. Intente de nuevo.'),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const avanzar = (status: 'OPEN' | 'IN_PROGRESS', mensaje: string) =>
    ejecutar(async () => {
      // Se envía solo la nota nueva: el servidor la agrega al historial con
      // fecha y autor, sin tocar lo que ya estaba escrito.
      await api.patch(`/work-orders/${orderId}/status`, {
        status,
        notes: notas.trim() || undefined,
      });
      setNotas('');
      return mensaje;
    });

  const cerrar = () => {
    setConfirmandoCierre(false);
    return ejecutar(async () => {
      const autoriza = autorizar && cierreTipo === 'COMPLETED';
      const { data } = await api.post<{
        vehicleStatus: VehicleStatus | null;
        operationAuthorized: boolean;
      }>(`/work-orders/${orderId}/close`, {
        status: cierreTipo,
        resolution: resolucion,
        authorizeOperation: autoriza,
      });
      setResolucion('');
      setAutorizar(false);
      if (data.operationAuthorized) {
        return 'Orden cerrada y operación autorizada. El vehículo queda operativo.';
      }
      return data.vehicleStatus
        ? `Orden cerrada. Según su último escaneo, el vehículo queda en estado «${ESTADO_VEHICULO[data.vehicleStatus].label.toLowerCase()}».`
        : 'Orden cerrada. El vehículo conserva su estado porque tiene otras órdenes sin cerrar.';
    });
  };

  const enviarAviso = () =>
    ejecutar(async () => {
      const { data } = await api.post<{ enviado: boolean; motivo?: string }>(
        `/work-orders/${orderId}/notify`,
      );
      if (!data.enviado) {
        throw new Error(data.motivo ?? 'No se pudo enviar el aviso.');
      }
      return 'Aviso enviado por Telegram y correo.';
    });

  const asignar = (assignedToId: string | null) =>
    ejecutar(async () => {
      await api.patch(`/work-orders/${orderId}/assign`, { assignedToId });
      return assignedToId ? 'Orden asignada.' : 'La orden quedó sin mecánico asignado.';
    });

  if (loading) {
    return <p className="text-sm text-ink-3">Cargando orden de trabajo…</p>;
  }

  if (!orden) {
    return (
      <div>
        <BackLink href="/dashboard/work-orders">Órdenes de trabajo</BackLink>
        <Notice tone="error">{error || 'No se pudo cargar la orden de trabajo.'}</Notice>
      </div>
    );
  }

  const abierta = ESTADOS_ABIERTOS.includes(orden.status);
  // Solo el mecánico asignado avanza la orden; quien administra las órdenes
  // también puede hacerlo. El servidor aplica la misma regla.
  const esAsignado = !!user && orden.assignedTo?.id === user.id;
  const puedeAvanzar =
    can(Permission.ORDER_UPDATE_STATUS) && (esAsignado || can(Permission.ORDER_ASSIGN));
  const puedeAutorizar = can(Permission.VEHICLE_AUTHORIZE) && cierreTipo === 'COMPLETED';
  const autoriza = autorizar && puedeAutorizar;
  const d = orden.diagnosis;

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <BackLink href="/dashboard/work-orders">Órdenes de trabajo</BackLink>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              Orden de trabajo de <span className="code">{orden.vehicle?.plate}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {orden.vehicle?.alias ? `${orden.vehicle.alias} · ` : ''}
              Creada el {fechaHora(orden.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={orden.status} />
            <PriorityBadge priority={orden.priority} />
            {can(Permission.REPORT_EXPORT) && <ReportButton tipo="orden" datos={orden} />}
          </div>
        </div>
      </div>

      {aviso && <Notice tone="success">{aviso}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Panel title="Motivo">
        <p className="max-w-[75ch] text-sm leading-relaxed text-ink">{orden.description}</p>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2">
          <Dato label="Mecánico asignado">
            {orden.assignedTo?.name ?? <span className="text-ink-2">Sin asignar</span>}
          </Dato>
          {orden.vehicle?.status && (
            <Dato label="Estado del vehículo">
              <VehicleStatusBadge status={orden.vehicle.status} />
            </Dato>
          )}
          <Dato label="Aviso al equipo (Telegram y correo)">
            <span className="flex flex-wrap items-center gap-3">
              {orden.n8nNotified ? 'Enviado' : <span className="text-ink-2">No enviado</span>}
              {abierta && can(Permission.ORDER_ASSIGN) && (
                <Button variant="secondary" size="sm" onClick={enviarAviso} disabled={trabajando}>
                  {orden.n8nNotified ? 'Volver a enviar' : 'Enviar aviso'}
                </Button>
              )}
            </span>
          </Dato>
        </dl>
      </Panel>

      {orden.scan && (
        <Panel
          title="Escaneo que originó la orden"
          action={
            <Link
              href={`/dashboard/scans/${orden.scan.id}`}
              className="text-sm font-medium text-navy hover:underline"
            >
              Ver el escaneo
            </Link>
          }
        >
          {orden.scan.dtcEntries?.length ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {orden.scan.dtcEntries.map((dtc) => (
                <li key={dtc.id} className="flex items-center gap-1.5">
                  <span className="code text-sm font-semibold text-ink">{dtc.code}</span>
                  <DtcTypeBadge type={dtc.type} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">El escaneo no registró códigos de falla.</p>
          )}
        </Panel>
      )}

      {d && can(Permission.DIAGNOSIS_READ) && (
        <Panel title="Hipótesis técnica asistida por IA">
          <Hipotesis diagnosis={d} />
        </Panel>
      )}

      <Panel title="Historial de notas">
        {orden.notes ? (
          <pre className="max-w-[75ch] whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
            {orden.notes}
          </pre>
        ) : (
          <p className="text-sm text-ink-2">Todavía no hay notas en esta orden.</p>
        )}
      </Panel>

      {!abierta && (
        <Notice tone="info">
          Esta orden está {orden.status === 'COMPLETED' ? 'completada' : 'cancelada'} y ya no
          admite cambios.
          {orden.closedAt && (
            <>
              {' '}
              Se cerró el {fechaHora(orden.closedAt)}
              {orden.closedBy ? `, por ${orden.closedBy.name}` : ''}.{' '}
              {orden.operationAuthorized
                ? 'Se autorizó la operación del vehículo.'
                : 'No se autorizó la operación del vehículo.'}
            </>
          )}
        </Notice>
      )}

      {abierta && can(Permission.ORDER_UPDATE_STATUS) && !puedeAvanzar && (
        <Notice tone="info">
          {orden.assignedTo
            ? `Esta orden está asignada a ${orden.assignedTo.name}. Solo esa persona puede registrar el avance.`
            : 'Esta orden todavía no tiene mecánico asignado. El administrador debe asignarla antes de registrar avances.'}
        </Notice>
      )}

      {abierta && can(Permission.ORDER_ASSIGN) && usuarios.length > 0 && (
        <Panel title="Asignación">
          <Field label="Mecánico a cargo" className="sm:w-96">
            {(id) => (
              <Select
                id={id}
                value={orden.assignedTo?.id ?? ''}
                disabled={trabajando}
                onChange={(e) => asignar(e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Panel>
      )}

      {abierta && puedeAvanzar && (
        <Panel title="Avance del trabajo">
          <Field
            label={orden.status === 'OPEN' ? 'Nota (opcional)' : 'Nota de avance'}
            hint="Se agrega al historial con su nombre y la fecha."
          >
            {(id) => (
              <Textarea
                id={id}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Qué se revisó, qué se encontró, qué falta"
              />
            )}
          </Field>
          <div className="mt-3">
            {orden.status === 'OPEN' ? (
              <Button
                onClick={() => avanzar('IN_PROGRESS', 'Trabajo iniciado.')}
                disabled={trabajando}
              >
                Iniciar trabajo
              </Button>
            ) : (
              <Button
                onClick={() => avanzar('IN_PROGRESS', 'Nota agregada al historial.')}
                disabled={trabajando || notas.trim().length === 0}
              >
                Agregar nota
              </Button>
            )}
          </div>
        </Panel>
      )}

      {abierta && can(Permission.ORDER_CLOSE) && (
        <Panel title="Cierre de la orden">
          <p className="mb-4 max-w-[75ch] text-sm text-ink-2">
            Cerrar la orden y autorizar la operación del vehículo son dos decisiones
            distintas. Si solo cierra la orden, el estado del vehículo se toma de su último
            escaneo: seguirá en «requiere evaluación» hasta que un escaneo nuevo confirme
            la reparación.
          </p>

          <div className="space-y-4">
            <Field label="Resultado" className="sm:w-64">
              {(id) => (
                <Select
                  id={id}
                  value={cierreTipo}
                  onChange={(e) => setCierreTipo(e.target.value as 'COMPLETED' | 'CANCELLED')}
                >
                  <option value="COMPLETED">Completada</option>
                  <option value="CANCELLED">Cancelada</option>
                </Select>
              )}
            </Field>

            <Field
              label="Justificación del cierre"
              hint="Obligatoria. Queda en el historial de la orden."
            >
              {(id) => (
                <Textarea
                  id={id}
                  value={resolucion}
                  onChange={(e) => setResolucion(e.target.value)}
                  rows={3}
                  placeholder={
                    cierreTipo === 'COMPLETED'
                      ? 'Qué se reparó y cómo se comprobó'
                      : 'Por qué se cancela la orden'
                  }
                />
              )}
            </Field>

            {puedeAutorizar && (
              <label className="flex items-start gap-2.5 rounded-control border border-line-strong px-3.5 py-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={autorizar}
                  onChange={(e) => setAutorizar(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                />
                <span>
                  <span className="font-semibold">Autorizar la operación del vehículo.</span>{' '}
                  <span className="text-ink-2">
                    El vehículo pasa a operativo y queda registrado que usted lo autorizó.
                  </span>
                </span>
              </label>
            )}
          </div>

          <Button
            className="mt-4"
            onClick={() => setConfirmandoCierre(true)}
            disabled={trabajando || resolucion.trim().length === 0}
          >
            {trabajando ? 'Cerrando…' : 'Cerrar orden'}
          </Button>
        </Panel>
      )}

      <ConfirmDialog
        open={confirmandoCierre}
        title="Cerrar orden"
        confirmLabel="Cerrar orden"
        busy={trabajando}
        onConfirm={cerrar}
        onCancel={() => setConfirmandoCierre(false)}
      >
        La orden quedará como{' '}
        <strong className="font-semibold text-ink">
          {cierreTipo === 'COMPLETED' ? 'completada' : 'cancelada'}
        </strong>{' '}
        y no se podrá volver a abrir.{' '}
        {autoriza
          ? 'Además, usted autoriza que el vehículo vuelva a operar.'
          : 'No se autoriza la operación del vehículo.'}
      </ConfirmDialog>
    </div>
  );
}
