'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { estadoHttp, mensajeDeError } from '@/lib/errors';
import { descripcionVehiculo, fechaHora } from '@/lib/format';
import { diagnosisState, dictamenDe, type Scan, type ScanSeverity } from '@/lib/types';
import { DtcTypeBadge, SEVERIDAD, SeverityBadge, Tag } from '@/components/Badges';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel';
import { IconAlert, Spinner } from '@/components/ui/icons';

/** Escaneos de ejemplo que se pueden registrar desde la web para una demostración. */
const ESCENARIOS = {
  tacoma: {
    etiqueta: 'Falla confirmada (Tacoma)',
    payload: {
      vin: '5TFCZ5AN3MX255216',
      batteryVoltage: 13.3,
      readinessStatus: {
        milOn: true,
        dtcCount: 2,
        monitorsCompleted: true,
        incompleteMonitors: [],
        compressionIgnition: false,
      },
      protocol: {
        number: '6',
        automatic: true,
        isCan: true,
        label: 'ISO 15765-4 CAN (11 bit, 500 kbaud)',
        raw: 'A6',
      },
      dtcs: [
        { code: 'P0300', type: 'CONFIRMED' },
        { code: 'P0301', type: 'CONFIRMED' },
      ],
    },
  },
  bus_reset: {
    etiqueta: 'Código pendiente con lectura no concluyente (bus)',
    payload: {
      vin: 'JTGFB518701122334',
      batteryVoltage: 12.5,
      readinessStatus: {
        milOn: false,
        dtcCount: 0,
        monitorsCompleted: false,
        incompleteMonitors: ['Catalizador', 'Sensor de Oxígeno', 'Sistema EVAP'],
        batteryResetSuspected: true,
        compressionIgnition: false,
      },
      dtcs: [{ code: 'P2195', type: 'PENDING' }],
    },
  },
  clean: {
    etiqueta: 'Escaneo sin fallas',
    payload: {
      vin: '8AJBA3CD201928374',
      batteryVoltage: 13.9,
      readinessStatus: {
        milOn: false,
        dtcCount: 0,
        monitorsCompleted: true,
        incompleteMonitors: [],
        compressionIgnition: false,
      },
      dtcs: [],
    },
  },
} as const;

type EscenarioKey = keyof typeof ESCENARIOS;

const pedirEscaneos = () => api.get<Scan[]>('/scans');

const SEVERIDADES: ScanSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];

const FILTROS_VACIOS = { vehiculo: '', severidad: '', desde: '', hasta: '' };

/** Día local de un escaneo, en el formato de `<input type="date">`. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export default function ScansPage() {
  const { can } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulando, setSimulando] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  // Vehículos que aparecen en el historial, para el filtro.
  const vehiculos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const s of scans) mapa.set(s.vehicleId, s.vehicle.plate);
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1]));
  }, [scans]);

  const filtrados = useMemo(
    () =>
      scans.filter((s) => {
        const dia = diaLocal(s.scannedAt);
        return (
          (!filtros.vehiculo || s.vehicleId === filtros.vehiculo) &&
          (!filtros.severidad || s.severity === filtros.severidad) &&
          (!filtros.desde || dia >= filtros.desde) &&
          (!filtros.hasta || dia <= filtros.hasta)
        );
      }),
    [scans, filtros],
  );

  const hayFiltros = Object.values(filtros).some(Boolean);
  const filtro = (nombre: keyof typeof FILTROS_VACIOS) => ({
    value: filtros[nombre],
    onChange: (e: { target: { value: string } }) =>
      setFiltros((f) => ({ ...f, [nombre]: e.target.value })),
  });

  const cargar = useCallback(async () => {
    const { data } = await pedirEscaneos();
    setScans(data);
  }, []);

  useEffect(() => {
    pedirEscaneos()
      .then(({ data }) => setScans(data))
      .catch((err) =>
        setError(
          estadoHttp(err) === 403
            ? 'Su rol no tiene permiso para consultar escaneos.'
            : mensajeDeError(err, 'No se pudieron cargar los escaneos.'),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  // Hay escaneos esperando su hipótesis: se refresca la lista sola.
  useEffect(() => {
    const hayPendientes = scans.some((s) => diagnosisState(s) === 'generando');
    if (!hayPendientes) return;

    const timer = setTimeout(() => {
      cargar().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [scans, cargar]);

  const simular = async (key: EscenarioKey) => {
    setSimulando(true);
    setError('');
    try {
      await api.post('/scans', ESCENARIOS[key].payload);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo registrar el escaneo de demostración.'));
    } finally {
      setSimulando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Escaneos"
        description="Historial de las lecturas enviadas desde la aplicación móvil, de la más reciente a la más antigua."
      />

      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}

      {!loading && scans.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          <Field label="Vehículo" className="w-full sm:w-44">
            {(id) => (
              <Select id={id} {...filtro('vehiculo')}>
                <option value="">Todos</option>
                {vehiculos.map(([vehicleId, placa]) => (
                  <option key={vehicleId} value={vehicleId}>
                    {placa}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Severidad" className="w-full sm:w-40">
            {(id) => (
              <Select id={id} {...filtro('severidad')}>
                <option value="">Todas</option>
                {SEVERIDADES.map((sev) => (
                  <option key={sev} value={sev}>
                    {SEVERIDAD[sev].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Desde" className="w-[calc(50%-0.5rem)] sm:w-40">
            {(id) => <Input id={id} type="date" max={filtros.hasta || undefined} {...filtro('desde')} />}
          </Field>
          <Field label="Hasta" className="w-[calc(50%-0.5rem)] sm:w-40">
            {(id) => <Input id={id} type="date" min={filtros.desde || undefined} {...filtro('hasta')} />}
          </Field>
          {hayFiltros && (
            <Button variant="quiet" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Quitar filtros
            </Button>
          )}
          <p className="ml-auto pb-2 text-sm text-ink-2">
            <span className="nums font-semibold text-ink">{filtrados.length}</span> de{' '}
            <span className="nums">{scans.length}</span>{' '}
            {scans.length === 1 ? 'escaneo' : 'escaneos'}
          </p>
        </div>
      )}

      <Panel flush>
        {loading ? (
          <p className="p-5 text-sm text-ink-3">Cargando escaneos…</p>
        ) : scans.length > 0 && filtrados.length === 0 ? (
          <EmptyState title="Ningún escaneo coincide con los filtros">
            Cambie el vehículo, la severidad o las fechas, o quite los filtros.
          </EmptyState>
        ) : scans.length === 0 ? (
          <EmptyState title="Aún no se registró ningún escaneo">
            Los escaneos se envían desde la aplicación móvil al conectar el lector al
            vehículo.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {filtrados.map((scan) => (
              <FilaEscaneo key={scan.id} scan={scan} />
            ))}
          </ul>
        )}
      </Panel>

      {can(Permission.SCAN_CREATE) && (
        <details className="mt-6 rounded-panel border border-dashed border-line-strong bg-surface">
          <summary className="cursor-pointer rounded-panel px-5 py-3 text-sm font-medium text-ink-2 hover:text-navy">
            Datos de demostración
          </summary>
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 max-w-[75ch] text-sm text-ink-2">
              Cada botón registra un escaneo de ejemplo, como si llegara desde la
              aplicación móvil. Queda guardado en el historial. Los dos primeros piden
              una hipótesis a la IA, que tiene costo (unos 2 centavos de dólar cada una).
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ESCENARIOS) as EscenarioKey[]).map((key) => (
                <Button
                  key={key}
                  variant="secondary"
                  size="sm"
                  disabled={simulando}
                  onClick={() => simular(key)}
                >
                  {ESCENARIOS[key].etiqueta}
                </Button>
              ))}
              {simulando && (
                <span className="flex items-center gap-2 text-xs text-ink-3">
                  <Spinner /> Registrando…
                </span>
              )}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function EstadoHipotesis({ scan }: { scan: Scan }) {
  const estado = diagnosisState(scan);

  if (estado === 'lista') return <Tag tone="marca">Con hipótesis de IA</Tag>;
  if (estado === 'fallida') return <Tag>Hipótesis no generada</Tag>;
  if (estado === 'generando') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Spinner />
        Generando hipótesis…
      </span>
    );
  }
  return null;
}

function FilaEscaneo({ scan }: { scan: Scan }) {
  const concluyente = scan.readinessStatus?.monitorsCompleted ?? true;
  const dictamen = dictamenDe(scan);
  const vehiculo = scan.vehicle.alias || descripcionVehiculo(scan.vehicle);

  return (
    <li>
      <Link
        href={`/dashboard/scans/${scan.id}`}
        className="block px-5 py-4 transition-colors hover:bg-app"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm">
              <span className="code font-semibold text-ink">{scan.vehicle.plate}</span>
              {vehiculo && <span className="ml-2 text-ink-2">{vehiculo}</span>}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              {fechaHora(scan.scannedAt)}
              {scan.scannedBy?.name ? ` · ${scan.scannedBy.name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoHipotesis scan={scan} />
            <SeverityBadge severity={scan.severity} />
          </div>
        </div>

        {scan.dtcEntries.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
            {scan.dtcEntries.map((dtc) => (
              <li key={dtc.id} className="flex items-center gap-1.5">
                <span className="code text-sm font-semibold text-ink">{dtc.code}</span>
                <DtcTypeBadge type={dtc.type} />
              </li>
            ))}
          </ul>
        )}

        {!concluyente && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warn">
            <IconAlert width={14} height={14} className="shrink-0" />
            Lectura no concluyente: hay que volver a escanear
          </p>
        )}

        {dictamen && (
          <p className="mt-2 line-clamp-2 max-w-[90ch] text-sm text-ink-2">{dictamen}</p>
        )}
      </Link>
    </li>
  );
}
