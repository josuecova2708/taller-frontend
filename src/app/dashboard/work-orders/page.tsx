'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/work-orders')
      .then((res) => setOrders(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Órdenes de Evaluación Técnica</h1>
        <p className="text-sm text-slate-500 mt-1">
          Órdenes generadas a partir de escaneos OBD-II e hipótesis técnicas asistidas por IA (requieren validación humana)
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          Cargando órdenes de trabajo...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          No hay órdenes de trabajo registradas.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((wo) => (
            <div
              key={wo.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 text-lg mr-2">
                    {wo.vehicle?.plate}
                  </span>
                  <span className="text-sm text-slate-600">{wo.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Prioridad: {wo.priority}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    Estado: {wo.status}
                  </span>
                </div>
              </div>

              {wo.diagnosis && (
                <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-slate-800">
                  <div className="font-bold text-indigo-950 mb-1">
                    Hipótesis Técnica Asociada ({wo.diagnosis.provider.toUpperCase()}):
                  </div>
                  <p>{wo.diagnosis.summary}</p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Asignado a: {wo.assignedTo?.name || 'Por asignar'}</span>
                <span>{wo.notes}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
