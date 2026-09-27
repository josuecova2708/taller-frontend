'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DtcEntry {
  id: string;
  code: string;
  type: 'CONFIRMED' | 'PENDING' | 'PERMANENT';
  description?: string;
}

interface Scan {
  id: string;
  vehicleId: string;
  batteryVoltage: number | null;
  scannedAt: string;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string | null;
  readinessStatus: {
    milOn?: boolean;
    dtcCount?: number;
    monitorsCompleted?: boolean;
    incompleteMonitors?: string[];
    batteryResetSuspected?: boolean;
  } | null;
  vehicle: {
    plate: string;
    alias: string | null;
    make: string | null;
    model: string | null;
  };
  scannedBy: {
    name: string;
    email: string;
  };
  dtcEntries: DtcEntry[];
  diagnosis?: {
    summary: string;
    recommendations: string[];
    provider: string;
  } | null;
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/scans');
      setScans(data);
    } catch (err) {
      console.error('Error al cargar escaneos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const triggerSimulatedScan = async (scenario: 'tacoma' | 'bus_reset' | 'clean') => {
    try {
      setSimulating(true);
      if (scenario === 'tacoma') {
        await api.post('/scans', {
          vin: '5TFCZ5AN3MX255216',
          batteryVoltage: 13.3,
          readinessStatus: {
            milOn: true,
            dtcCount: 2,
            monitorsCompleted: true,
            incompleteMonitors: [],
          },
          dtcs: [
            { code: 'P0300', type: 'CONFIRMED' },
            { code: 'P0301', type: 'CONFIRMED' },
            { code: 'P0301', type: 'PERMANENT' },
          ],
        });
      } else if (scenario === 'bus_reset') {
        await api.post('/scans', {
          vin: 'JTGFB518701122334',
          batteryVoltage: 12.5,
          readinessStatus: {
            milOn: false,
            dtcCount: 0,
            monitorsCompleted: false,
            incompleteMonitors: ['Catalizador', 'Sensor O2', 'EVAP'],
            batteryResetSuspected: true,
          },
          dtcs: [{ code: 'P2195', type: 'PENDING' }],
        });
      } else {
        await api.post('/scans', {
          vin: '8AJBA3CD201928374',
          batteryVoltage: 13.9,
          readinessStatus: {
            milOn: false,
            dtcCount: 0,
            monitorsCompleted: true,
            incompleteMonitors: [],
          },
          dtcs: [],
        });
      }
      await fetchScans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al simular escaneo');
    } finally {
      setSimulating(false);
    }
  };

  const severityBadge = (sev: Scan['severity']) => {
    const map: Record<Scan['severity'], { bg: string; label: string }> = {
      NONE: { bg: 'bg-emerald-100 text-emerald-800', label: 'SIN FALLAS (NONE)' },
      LOW: { bg: 'bg-blue-100 text-blue-800', label: 'SEGUIMIENTO (LOW)' },
      MEDIUM: { bg: 'bg-amber-100 text-amber-800', label: 'EVALUACIÓN MEDIA' },
      HIGH: { bg: 'bg-orange-100 text-orange-800', label: 'PRIORIDAD ALTA' },
      CRITICAL: { bg: 'bg-red-100 text-red-800', label: 'CRÍTICO (RECURRENTE)' },
    };
    const item = map[sev] || map.NONE;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.bg}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Escaneos OBD-II</h1>
          <p className="text-sm text-slate-500 mt-1">
            Lecturas recibidas desde la app Android con estado global de monitores (Mode 01 PID 01) y filtro determinístico
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={simulating}
            onClick={() => triggerSimulatedScan('tacoma')}
            className="px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            ⚡ Simular Caso Tacoma (P0300/P0301)
          </button>
          <button
            disabled={simulating}
            onClick={() => triggerSimulatedScan('bus_reset')}
            className="px-3 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            🔋 Simular Caso Bus (Post-Batería)
          </button>
          <button
            disabled={simulating}
            onClick={() => triggerSimulatedScan('clean')}
            className="px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            ✅ Simular Escaneo Limpio
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          Cargando historial de escaneos...
        </div>
      ) : scans.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          No hay escaneos registrados todavía.
        </div>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => {
            const monitorsOk = scan.readinessStatus?.monitorsCompleted ?? true;
            const incompleteList = scan.readinessStatus?.incompleteMonitors || [];
            return (
              <div
                key={scan.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {scan.vehicle.plate}
                      </span>
                      <span className="text-sm text-slate-600">
                        {[scan.vehicle.make, scan.vehicle.model].filter(Boolean).join(' ')} —{' '}
                        {scan.vehicle.alias}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Escaneado el {new Date(scan.scannedAt).toLocaleString()} por{' '}
                      {scan.scannedBy?.name || 'Inspector'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {scan.batteryVoltage && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">
                        🔋 {scan.batteryVoltage.toFixed(1)}V
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        monitorsOk
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {monitorsOk
                        ? 'Monitores OBD: Completos'
                        : `Monitores Incompletos (${incompleteList.join(', ') || 'Recalibrando'})`}
                    </span>
                    {severityBadge(scan.severity)}
                  </div>
                </div>

                {/* Códigos DTC */}
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Códigos DTC Reportados ({scan.dtcEntries.length})
                  </div>
                  {scan.dtcEntries.length === 0 ? (
                    <div className="text-sm text-emerald-700 font-medium">
                      ✓ Ningún código DTC reportado en Modos 03 / 07 / 0A
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scan.dtcEntries.map((dtc) => (
                        <div
                          key={dtc.id}
                          className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-900 mr-2">
                              {dtc.code}
                            </span>
                            <span className="text-xs text-slate-600">{dtc.description}</span>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              dtc.type === 'CONFIRMED'
                                ? 'bg-red-100 text-red-800'
                                : dtc.type === 'PERMANENT'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {dtc.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dictamen del filtro determinístico / Hipótesis IA */}
                {scan.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">
                      Dictamen Filtro Determinístico:{' '}
                    </span>
                    {scan.notes}
                  </div>
                )}

                {scan.diagnosis && (
                  <div className="mt-3 p-3.5 bg-indigo-50/70 rounded-lg border border-indigo-200 text-xs text-slate-800">
                    <div className="font-bold text-indigo-950 mb-1">
                      🤖 Hipótesis Técnica Asistida ({scan.diagnosis.provider.toUpperCase()}) — Sujeta a validación humana:
                    </div>
                    <p className="mb-2">{scan.diagnosis.summary}</p>
                    {Array.isArray(scan.diagnosis.recommendations) && (
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {scan.diagnosis.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
