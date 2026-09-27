'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface Vehicle {
  id: string;
  plate: string;
  vin: string | null;
  alias: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: 'OK' | 'ALERT' | 'CRITICAL';
  createdAt: string;
  _count?: {
    scans: number;
    workOrders: number;
  };
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState({
    plate: '',
    vin: '',
    alias: '',
    make: '',
    model: '',
    year: '2021',
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/vehicles');
      setVehicles(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar vehículos desde el backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setForm({ plate: '', vin: '', alias: '', make: 'Toyota', model: '', year: '2021' });
    setModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({
      plate: v.plate,
      vin: v.vin || '',
      alias: v.alias || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year ? String(v.year) : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        plate: form.plate,
        vin: form.vin || undefined,
        alias: form.alias || undefined,
        make: form.make || undefined,
        model: form.model || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
      };

      if (editingVehicle) {
        await api.patch(`/vehicles/${editingVehicle.id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar el vehículo');
    }
  };

  const handleDelete = async (id: string, plate: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el vehículo ${plate}?`)) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar el vehículo');
    }
  };

  const renderStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            🟢 Operativo (OK)
          </span>
        );
      case 'ALERT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            🟡 En Seguimiento (ALERT)
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            🔴 Requiere Evaluación
          </span>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flota de Vehículos UAGRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de unidades institucionales y estado preventivo por escaneo OBD-II
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          + Registrar Vehículo
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando flota de vehículos...</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay vehículos registrados. Haz clic en &ldquo;+ Registrar Vehículo&rdquo; para comenzar.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Placa / Alias</th>
                <th className="py-3.5 px-4">Vehículo</th>
                <th className="py-3.5 px-4">VIN (Modo 09)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center">Escaneos</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{v.plate}</div>
                    <div className="text-xs text-slate-500">{v.alias || 'Sin alias asignado'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {[v.make, v.model, v.year].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                    {v.vin || <span className="text-slate-400 italic">No registrado</span>}
                  </td>
                  <td className="py-3.5 px-4">{renderStatusBadge(v.status)}</td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                    {v._count?.scans ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(v)}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.plate)}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingVehicle ? `Editar Vehículo ${editingVehicle.plate}` : 'Registrar Nuevo Vehículo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5521-TAC"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    placeholder="2021"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VIN (17 caracteres - opcional si la ECU no lo reporta)
                </label>
                <input
                  type="text"
                  placeholder="5TFCZ5AN3MX255216"
                  value={form.vin}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Toyota"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Tacoma"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alias / Unidad Asignada
                </label>
                <input
                  type="text"
                  placeholder="Camioneta Facultad Ciencias Agrícolas"
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
