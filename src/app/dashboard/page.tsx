'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/vehicles').catch(() => ({ data: [] })),
      api.get('/scans').catch(() => ({ data: [] })),
      api.get('/work-orders').catch(() => ({ data: [] })),
    ]).then(([vRes, sRes, wRes]) => {
      setVehicles(vRes.data || []);
      setScans(sRes.data || []);
      setWorkOrders(wRes.data || []);
      setLoading(false);
    });
  }, []);

  const okCount = vehicles.filter((v) => v.status === 'OK').length;
  const alertCount = vehicles.filter((v) => v.status === 'ALERT').length;
  const criticalCount = vehicles.filter((v) => v.status === 'CRITICAL').length;
  const openOrders = workOrders.filter((w) => w.status === 'OPEN' || w.status === 'IN_PROGRESS').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Panel General — Diagnóstico Preventivo OBD-II
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Estado en vivo de la flota vehicular UAGRM y evaluaciones técnicas recientes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
          <div className="text-xs font-semibold uppercase text-slate-400">Total Vehículos</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {loading ? '—' : vehicles.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            🟢 {okCount} OK · 🟡 {alertCount} Seguimiento · 🔴 {criticalCount} Críticos
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
          <div className="text-xs font-semibold uppercase text-slate-400">
            Unidades en Seguimiento / Evaluación
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2">
            {loading ? '—' : alertCount + criticalCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Requieren re-escaneo o validación mecánica
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
          <div className="text-xs font-semibold uppercase text-slate-400">Escaneos Registrados</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? '—' : scans.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Con lectura Mode 03/07/0A + PID 01</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
          <div className="text-xs font-semibold uppercase text-slate-400">
            Órdenes de Evaluación Abiertas
          </div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {loading ? '—' : openOrders}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sujetas a validación técnica humana</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de flota */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Estado Actual de la Flota</h2>
            <Link
              href="/dashboard/vehicles"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {v.plate} — {[v.make, v.model, v.year].filter(Boolean).join(' ')}
                  </div>
                  <div className="text-xs text-slate-500">{v.alias}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    v.status === 'OK'
                      ? 'bg-emerald-100 text-emerald-800'
                      : v.status === 'ALERT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {v.status === 'OK'
                    ? '🟢 OK'
                    : v.status === 'ALERT'
                    ? '🟡 Seguimiento'
                    : '🔴 Evaluación'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos escaneos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Últimos Escaneos Recibidos</h2>
            <Link
              href="/dashboard/scans"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver historial →
            </Link>
          </div>
          <div className="space-y-3">
            {scans.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {s.vehicle?.plate} ({s.dtcEntries?.length || 0} DTCs)
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(s.scannedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{s.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
