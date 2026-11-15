'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { descripcionVehiculo, fecha, fechaHora, hace } from '@/lib/format';
import type { DtcEntry, VehicleDetail, VehicleScan } from '@/lib/types';
import {
  DtcTypeBadge,
  OrderStatusBadge,
  PriorityBadge,
  SEVERIDAD,
  SeverityBadge,
  Tag,
  VehicleStatusBadge,
} from '@/components/Badges';
import { Field, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { BackLink, Dato, EmptyState, Panel } from '@/components/ui/Panel';
import { ReportButton } from '@/components/ReportButton';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const [vehiculo, setVehiculo] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    api
      .get<VehicleDetail>(`/vehicles/${id}`)
      .then(({ data }) => {
        if (!cancelado) setVehiculo(data);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(
          estadoHttp(err) === 404
            ? 'Este vehículo no existe.'
            : mensajeDeError(err, 'No se pudo cargar el vehículo.'),
        );
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (loading) {
    return <p className="text-sm text-ink-3">Cargando vehículo…</p>;
  }

  if (!vehiculo) {
    return (
      <div>
        <BackLink href="/dashboard/vehicles">Vehículos</BackLink>
        <Notice tone="error">{error || 'No se pudo cargar el vehículo.'}</Notice>
      </div>
    );
  }

  const deBaja = vehiculo.active === false;
  const ultimo = vehiculo.scans[0];

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <BackLink href="/dashboard/vehicles">Vehículos</BackLink>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              <span className="code">{vehiculo.plate}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {[descripcionVehiculo(vehiculo), vehiculo.alias].filter(Boolean).join(' · ') ||
                'Sin descripción'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {deBaja ? <Tag>Dado de baja</Tag> : <VehicleStatusBadge status={vehiculo.status} />}
            {can(Permission.REPORT_EXPORT) && (
              <ReportButton tipo="vehiculo" datos={vehiculo} />
            )}
          </div>
        </div>
      </div>

      <Panel title="Datos del vehículo">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <Dato label="Número de chasis (VIN)">
            {vehiculo.vin ? (
              <span className="code text-xs">{vehiculo.vin}</span>
            ) : (
              <span className="text-ink-2">No registrado</span>
            )}
          </Dato>
          <Dato label="Registrado el">{fecha(vehiculo.createdAt)}</Dato>
          <Dato label="Escaneos">
            <span className="nums">{vehiculo.scans.length}</span>
          </Dato>
          <Dato label="Último escaneo">
            {ultimo ? hace(ultimo.scannedAt) : <span className="text-ink-2">Nunca</span>}
          </Dato>
        </dl>
      </Panel>

      <Panel title="Comparar dos escaneos">
        {vehiculo.scans.length < 2 ? (
          <p className="text-sm text-ink-2">
            Hacen falta al menos dos escaneos de este vehículo para compararlos.
          </p>
        ) : (
          <Comparacion scans={vehiculo.scans} />
        )}
      </Panel>

      <Panel title={`Historial de escaneos (${vehiculo.scans.length})`} flush>
        {vehiculo.scans.length === 0 ? (
          <EmptyState title="Este vehículo todavía no fue escaneado">
            Los escaneos se envían desde la aplicación móvil.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {vehiculo.scans.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/scans/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-app"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{fechaHora(s.scannedAt)}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {s.scannedBy?.name ? `${s.scannedBy.name} · ` : ''}
                      {s.dtcEntries.length === 0 ? (
                        'Sin códigos de falla'
                      ) : (
                        <span className="code">{s.dtcEntries.map((d) => d.code).join(', ')}</span>
                      )}
                    </p>
                  </div>
                  <SeverityBadge severity={s.severity} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {can(Permission.ORDER_READ) && (
        <Panel title={`Órdenes de trabajo (${vehiculo.workOrders.length})`} flush>
          {vehiculo.workOrders.length === 0 ? (
            <EmptyState title="Este vehículo no tiene órdenes de trabajo" />
          ) : (
            <ul className="divide-y divide-line">
              {vehiculo.workOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/work-orders/${o.id}`}
                    className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-app"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="line-clamp-2 text-sm text-ink">{o.description}</p>
                      <p className="mt-0.5 text-xs text-ink-3">
                        Creada el {fecha(o.createdAt)} ·{' '}
                        {o.assignedTo ? `Asignada a ${o.assignedTo.name}` : 'Sin mecánico asignado'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={o.priority} />
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function etiquetaEscaneo(s: VehicleScan): string {
  return `${fechaHora(s.scannedAt)} · ${SEVERIDAD[s.severity].label}`;
}

/**
 * Comparación de dos escaneos del mismo vehículo (CU11): qué códigos
 * aparecieron, cuáles se mantienen y cuáles ya no están.
 */
function Comparacion({ scans }: { scans: VehicleScan[] }) {
  // Por defecto, los dos más recientes (la lista llega del más nuevo al más viejo).
  const [idA, setIdA] = useState(scans[1].id);
  const [idB, setIdB] = useState(scans[0].id);

  const resultado = useMemo(() => {
    const a = scans.find((s) => s.id === idA);
    const b = scans.find((s) => s.id === idB);
    if (!a || !b || a.id === b.id) return null;

    // Siempre se compara del más antiguo al más reciente, se elijan como se elijan.
    const [antes, despues] =
      new Date(a.scannedAt) <= new Date(b.scannedAt) ? [a, b] : [b, a];
    const codigosAntes = new Set(antes.dtcEntries.map((d) => d.code));
    const codigosDespues = new Set(despues.dtcEntries.map((d) => d.code));

    return {
      antes,
      despues,
      nuevos: despues.dtcEntries.filter((d) => !codigosAntes.has(d.code)),
      persisten: despues.dtcEntries.filter((d) => codigosAntes.has(d.code)),
      resueltos: antes.dtcEntries.filter((d) => !codigosDespues.has(d.code)),
    };
  }, [scans, idA, idB]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Escaneo anterior">
          {(id) => (
            <Select id={id} value={idA} onChange={(e) => setIdA(e.target.value)}>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {etiquetaEscaneo(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Escaneo posterior">
          {(id) => (
            <Select id={id} value={idB} onChange={(e) => setIdB(e.target.value)}>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {etiquetaEscaneo(s)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {!resultado ? (
        <p className="mt-4 text-sm text-ink-2">Elija dos escaneos distintos para compararlos.</p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
            <Dato label="Período">
              {fecha(resultado.antes.scannedAt)} a {fecha(resultado.despues.scannedAt)}
            </Dato>
            <Dato label="Severidad">
              <span className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={resultado.antes.severity} />
                <span className="text-ink-3">a</span>
                <SeverityBadge severity={resultado.despues.severity} />
              </span>
            </Dato>
            <Dato label="Voltaje de batería">
              <span className="nums">
                {voltaje(resultado.antes.batteryVoltage)} a{' '}
                {voltaje(resultado.despues.batteryVoltage)}
              </span>
            </Dato>
          </dl>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <GrupoCodigos
              titulo="Aparecieron"
              vacio="Ningún código nuevo"
              codigos={resultado.nuevos}
            />
            <GrupoCodigos
              titulo="Se mantienen"
              vacio="Ningún código se repite"
              codigos={resultado.persisten}
            />
            <GrupoCodigos
              titulo="Ya no aparecen"
              vacio="Ningún código desapareció"
              codigos={resultado.resueltos}
            />
          </div>

          {resultado.resueltos.length > 0 &&
            resultado.despues.readinessStatus?.monitorsCompleted === false && (
              <Notice tone="warning" className="mt-4">
                El escaneo posterior tiene monitores incompletos. Que un código ya no
                aparezca no confirma la reparación: puede deberse a que se borraron los
                códigos o se desconectó la batería.
              </Notice>
            )}
        </>
      )}
    </div>
  );
}

function voltaje(v: number | null): string {
  return v === null ? 'sin dato' : `${v.toFixed(1)} V`;
}

function GrupoCodigos({
  titulo,
  vacio,
  codigos,
}: {
  titulo: string;
  vacio: string;
  codigos: DtcEntry[];
}) {
  return (
    <div className="rounded-control border border-line">
      <h3 className="border-b border-line bg-app px-3 py-2 text-xs font-semibold text-ink-2">
        {titulo} <span className="nums font-normal text-ink-3">({codigos.length})</span>
      </h3>
      {codigos.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-ink-3">{vacio}</p>
      ) : (
        <ul className="divide-y divide-line">
          {codigos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="code text-sm font-semibold text-ink">{d.code}</span>
              <DtcTypeBadge type={d.type} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
