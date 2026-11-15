'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { descripcionVehiculo, fechaHora } from '@/lib/format';
import { diagnosisState, dictamenDe, observacionDe, type Scan } from '@/lib/types';
import {
  DtcTypeBadge,
  OrderStatusBadge,
  PriorityBadge,
  SEVERIDAD,
  SeverityBadge,
} from '@/components/Badges';
import { Hipotesis } from '@/components/Hipotesis';
import { ReportButton } from '@/components/ReportButton';
import { Button, buttonClass } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { BackLink, Dato, Panel } from '@/components/ui/Panel';
import { IconAlert, IconCheck, Spinner } from '@/components/ui/icons';

/** Cada cuánto se vuelve a consultar mientras la hipótesis se genera. */
const INTERVALO_SONDEO_MS = 4000;

/** Tope de espera antes de dejar de sondear y ofrecer reintento manual. */
const MAX_SONDEOS = 15;

const TITULO_HIPOTESIS = 'Hipótesis técnica asistida por IA';

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const scanId = params.id;
  const { can } = useAuth();

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reintentando, setReintentando] = useState(false);
  const [creandoOrden, setCreandoOrden] = useState(false);
  const [aviso, setAviso] = useState('');
  const sondeos = useRef(0);
  // Se dejó de esperar la hipótesis: se ofrece pedirla de nuevo a mano.
  const [agotado, setAgotado] = useState(false);

  const pedir = useCallback(() => api.get<Scan>(`/scans/${scanId}`), [scanId]);

  const cargar = useCallback(async () => {
    const { data } = await pedir();
    setScan(data);
  }, [pedir]);

  useEffect(() => {
    let cancelado = false;

    pedir()
      .then(({ data }) => {
        if (!cancelado) setScan(data);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(
          estadoHttp(err) === 404
            ? 'Este escaneo no existe o fue eliminado.'
            : mensajeDeError(err, 'No se pudo cargar el escaneo.'),
        );
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [pedir]);

  // La hipótesis se genera en segundo plano (unos 9 segundos), así que la
  // pantalla sondea en lugar de exigir que el usuario recargue.
  useEffect(() => {
    if (!scan || diagnosisState(scan) !== 'generando') return;
    if (sondeos.current >= MAX_SONDEOS) return;

    const timer = setTimeout(() => {
      sondeos.current += 1;
      if (sondeos.current >= MAX_SONDEOS) setAgotado(true);
      cargar().catch(() => {
        /* un fallo de sondeo no debe romper la pantalla ya cargada */
      });
    }, INTERVALO_SONDEO_MS);

    return () => clearTimeout(timer);
  }, [scan, cargar]);

  const reintentar = async () => {
    setReintentando(true);
    setError('');
    try {
      await api.post(`/scans/${scanId}/diagnosis`);
      sondeos.current = 0;
      setAgotado(false);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo solicitar la hipótesis.'));
    } finally {
      setReintentando(false);
    }
  };

  // Orden creada a mano, para un escaneo que no generó una por su cuenta.
  const crearOrden = async () => {
    setCreandoOrden(true);
    setError('');
    setAviso('');
    try {
      await api.post('/work-orders', { scanId });
      await cargar();
      setAviso('Orden de trabajo creada. Ya puede asignarla a un mecánico.');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo crear la orden de trabajo.'));
    } finally {
      setCreandoOrden(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-ink-3">Cargando escaneo…</p>;
  }

  if (!scan) {
    return (
      <div>
        <BackLink href="/dashboard/scans">Escaneos</BackLink>
        <Notice tone="error">{error || 'No se pudo cargar el escaneo.'}</Notice>
      </div>
    );
  }

  const estado = diagnosisState(scan);
  const readiness = scan.readinessStatus;
  const monitoresOk = readiness?.monitorsCompleted ?? true;
  const incompletos = readiness?.incompleteMonitors ?? [];
  const dictamen = dictamenDe(scan);
  const observacion = observacionDe(scan);
  const descripcion = [descripcionVehiculo(scan.vehicle), scan.vehicle.alias]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <BackLink href="/dashboard/scans">Escaneos</BackLink>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">
              Escaneo de <span className="code">{scan.vehicle.plate}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {descripcion && <>{descripcion} · </>}
              {fechaHora(scan.scannedAt)}
              {scan.scannedBy?.name ? ` · por ${scan.scannedBy.name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-ink-2">
              Severidad
              <SeverityBadge severity={scan.severity} />
            </span>
            {can(Permission.REPORT_EXPORT) && <ReportButton tipo="escaneo" datos={scan} />}
          </div>
        </div>
      </div>

      {aviso && <Notice tone="success">{aviso}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {/* Lo primero que se lee: qué concluyó el sistema. */}
      {dictamen && (
        <Panel title="Evaluación automática">
          <p className="max-w-[75ch] text-sm leading-relaxed text-ink">{dictamen}</p>
          <p className="mt-2 max-w-[75ch] text-xs text-ink-3">
            Se calcula con reglas fijas a partir del tipo de cada código, si se repite en
            escaneos anteriores y el estado de los monitores. No interviene la IA.
          </p>
        </Panel>
      )}

      {observacion && (
        <Panel title="Observación del inspector">
          <p className="max-w-[75ch] text-sm text-ink">{observacion}</p>
        </Panel>
      )}

      <Panel title={`Códigos de falla (${scan.dtcEntries.length})`} flush>
        {scan.dtcEntries.length === 0 ? (
          <p className="flex items-center gap-2 p-5 text-sm text-ink">
            <IconCheck className="shrink-0 text-ok" />
            El vehículo no reportó ningún código de falla.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {scan.dtcEntries.map((dtc) => (
              <li
                key={dtc.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3"
              >
                <div className="min-w-0">
                  <span className="code mr-3 text-base font-semibold text-ink">{dtc.code}</span>
                  <span className="text-sm text-ink-2">
                    {dtc.description || 'Sin descripción en el catálogo'}
                  </span>
                </div>
                <DtcTypeBadge type={dtc.type} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Monitores de preparación">
        {monitoresOk ? (
          <p className="flex items-start gap-2 text-sm text-ink">
            <IconCheck className="mt-px shrink-0 text-ok" />
            <span>
              Completos. El vehículo terminó sus autocomprobaciones, así que la lectura es
              concluyente.
            </span>
          </p>
        ) : (
          <div className="flex items-start gap-2 text-sm text-ink">
            <IconAlert className="mt-px shrink-0 text-warn" />
            <div className="max-w-[75ch]">
              <p className="font-medium">
                Incompletos: {incompletos.join(', ') || 'no se identificó cuáles'}
              </p>
              <p className="mt-1 text-ink-2">
                La lectura no es concluyente. Hay que volver a escanear después de un
                ciclo de conducción completo.
              </p>
              {readiness?.batteryResetSuspected && (
                <p className="mt-1 text-ink-2">
                  Varios monitores incompletos a la vez suelen indicar que se desconectó
                  la batería o se borraron los códigos hace poco.
                </p>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Datos de la lectura">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <Dato label="Voltaje de batería">
            {scan.batteryVoltage !== null ? (
              <span className="nums">{scan.batteryVoltage.toFixed(1)} V</span>
            ) : (
              'No medido'
            )}
          </Dato>
          <Dato label="Luz de falla del tablero">
            {readiness?.milOn === undefined ? (
              'Sin dato'
            ) : readiness.milOn ? (
              <span className="inline-flex items-center gap-1.5 text-danger">
                <IconAlert width={16} height={16} />
                Encendida
              </span>
            ) : (
              'Apagada'
            )}
          </Dato>
          <Dato label="Tipo de motor">
            {readiness?.compressionIgnition === undefined
              ? 'Sin dato'
              : readiness.compressionIgnition
                ? 'Diésel'
                : 'Gasolina'}
          </Dato>
          <Dato label="Protocolo de comunicación">
            <span className="text-xs">{scan.protocol?.label ?? 'No registrado'}</span>
          </Dato>
        </dl>
        {readiness?.rawHex && (
          <p className="mt-4 text-xs text-ink-3">
            Respuesta original del estado de monitores:{' '}
            <span className="code">{readiness.rawHex}</span>
          </p>
        )}
      </Panel>

      {can(Permission.DIAGNOSIS_READ) && (
        <Panel title={TITULO_HIPOTESIS}>
          {estado === 'lista' && scan.diagnosis ? (
            <Hipotesis diagnosis={scan.diagnosis} severidadEscaneo={scan.severity} />
          ) : estado === 'no-requerida' ? (
            <p className="max-w-[75ch] text-sm text-ink-2">
              Este escaneo no necesitó hipótesis. La evaluación automática le dio una
              severidad «{SEVERIDAD[scan.severity].label.toLowerCase()}», y solo se
              consulta a la IA desde la severidad media.
            </p>
          ) : estado === 'generando' && !agotado ? (
            <p className="flex items-center gap-2.5 text-sm text-ink-2" role="status">
              <Spinner />
              Generando la hipótesis. Tarda unos segundos y aparece sola en esta pantalla.
            </p>
          ) : (
            <div>
              <p className="max-w-[75ch] text-sm text-ink-2">
                No se pudo generar la hipótesis. El escaneo y su orden de trabajo siguen
                siendo válidos, porque se basan en la evaluación automática y no en la IA.
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={reintentar}
                disabled={reintentando}
              >
                {reintentando ? 'Solicitando…' : 'Volver a solicitar la hipótesis'}
              </Button>
            </div>
          )}
        </Panel>
      )}

      {scan.workOrder && can(Permission.ORDER_READ) && (
        <Panel title="Orden de trabajo">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={scan.workOrder.status} />
              <PriorityBadge priority={scan.workOrder.priority} />
            </div>
            <Link
              href={`/dashboard/work-orders/${scan.workOrder.id}`}
              className={buttonClass('secondary', 'sm')}
            >
              Ver la orden
            </Link>
          </div>
        </Panel>
      )}

      {!scan.workOrder && can(Permission.ORDER_CREATE) && (
        <Panel title="Orden de trabajo">
          <p className="max-w-[75ch] text-sm text-ink-2">
            Este escaneo no generó una orden de trabajo. Si igual quiere que un mecánico
            revise el vehículo, puede crearla a mano.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={crearOrden}
            disabled={creandoOrden}
          >
            {creandoOrden ? 'Creando…' : 'Crear orden de trabajo'}
          </Button>
        </Panel>
      )}
    </div>
  );
}
