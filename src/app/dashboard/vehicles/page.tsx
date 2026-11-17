'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { mensajeDeError } from '@/lib/errors';
import { descripcionVehiculo } from '@/lib/format';
import { Tag, VehicleStatusBadge } from '@/components/Badges';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel';
import { IconSearch } from '@/components/ui/icons';
import type { Responsible } from '@/lib/types';

export interface Vehicle {
  id: string;
  plate: string;
  vin: string | null;
  alias: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: 'OK' | 'ALERT' | 'CRITICAL';
  active?: boolean;
  createdAt: string;
  responsible?: Responsible | null;
  _count?: {
    scans: number;
    workOrders: number;
  };
}

interface Usuario {
  id: string;
  name: string;
  role: string;
  active?: boolean;
}

const FORM_VACIO = {
  plate: '',
  vin: '',
  alias: '',
  make: '',
  model: '',
  year: '',
  responsibleId: '',
};
const ID_FORM = 'form-vehiculo';

export default function VehiclesPage() {
  const { can } = useAuth();
  // Los botones de gestión solo se muestran a quien puede usarlos.
  const puedeGestionar = can(Permission.VEHICLE_WRITE);

  const [busqueda, setBusqueda] = useState('');
  const [verBajas, setVerBajas] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [porDarDeBaja, setPorDarDeBaja] = useState<Vehicle | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  // Candidatos a responsable: inspectores con la cuenta activa. La lista de
  // usuarios solo la ve quien administra cuentas; quien no, no ve el selector.
  const puedeVerUsuarios = can(Permission.USER_MANAGE);
  const [inspectores, setInspectores] = useState<Usuario[]>([]);

  useEffect(() => {
    if (!puedeGestionar || !puedeVerUsuarios) return;
    api
      .get<Usuario[]>('/auth/users')
      .then(({ data }) =>
        setInspectores(data.filter((u) => u.role === 'INSPECTOR' && u.active !== false)),
      )
      .catch(() => setInspectores([]));
  }, [puedeGestionar, puedeVerUsuarios]);

  const pedir = useCallback(
    () =>
      api.get<Vehicle[]>('/vehicles', {
        params: verBajas ? { includeInactive: 'true' } : undefined,
      }),
    [verBajas],
  );

  const cargar = async () => {
    const { data } = await pedir();
    setVehicles(data);
  };

  useEffect(() => {
    let cancelado = false;
    pedir()
      .then(({ data }) => {
        if (cancelado) return;
        setVehicles(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar los vehículos.'));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [pedir]);

  // Búsqueda por placa o VIN (también por alias, que es como se los conoce, y
  // por el nombre del responsable).
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.plate, v.vin, v.alias, v.responsible?.name].some((campo) =>
        campo?.toUpperCase().includes(q),
      ),
    );
  }, [vehicles, busqueda]);

  const abrirRegistro = () => {
    setEditingVehicle(null);
    setForm(FORM_VACIO);
    setErrorForm('');
    setModalOpen(true);
  };

  const abrirEdicion = (v: Vehicle) => {
    setEditingVehicle(v);
    setForm({
      plate: v.plate,
      vin: v.vin || '',
      alias: v.alias || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year ? String(v.year) : '',
      responsibleId: v.responsible?.id ?? '',
    });
    setErrorForm('');
    setModalOpen(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = {
        plate: form.plate,
        vin: form.vin || undefined,
        alias: form.alias || undefined,
        make: form.make || undefined,
        model: form.model || undefined,
        year: form.year ? parseInt(form.year, 10) : undefined,
      };
      // El responsable solo se envía si el selector está disponible y el valor
      // cambió («Sin asignar» = null). Así un responsable que dejó de ser
      // candidato no impide guardar el resto de los datos.
      const responsableOriginal = editingVehicle?.responsible?.id ?? '';
      const datos =
        puedeVerUsuarios && form.responsibleId !== responsableOriginal
          ? { ...payload, responsibleId: form.responsibleId || null }
          : payload;

      if (editingVehicle) {
        await api.patch(`/vehicles/${editingVehicle.id}`, datos);
        setAviso(`Se guardaron los cambios del vehículo ${form.plate}.`);
      } else {
        await api.post('/vehicles', datos);
        setAviso(`Vehículo ${form.plate} registrado.`);
      }
      setModalOpen(false);
      await cargar();
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo guardar el vehículo.'));
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async () => {
    if (!porDarDeBaja) return;
    setDandoDeBaja(true);
    setError('');
    setAviso('');
    try {
      await api.delete(`/vehicles/${porDarDeBaja.id}`);
      setAviso(`El vehículo ${porDarDeBaja.plate} fue dado de baja.`);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo dar de baja el vehículo.'));
    } finally {
      setDandoDeBaja(false);
      setPorDarDeBaja(null);
    }
  };

  const reactivar = async (v: Vehicle) => {
    setError('');
    setAviso('');
    try {
      await api.patch(`/vehicles/${v.id}/reactivate`);
      setAviso(`El vehículo ${v.plate} volvió a la flota.`);
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo reactivar el vehículo.'));
    }
  };

  const campo = (nombre: keyof typeof FORM_VACIO) => ({
    value: form[nombre],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [nombre]: e.target.value })),
  });

  return (
    <div>
      <PageHeader
        title="Vehículos"
        description="Registro de los vehículos de la flota y su estado según el último escaneo."
        actions={
          puedeGestionar && <Button onClick={abrirRegistro}>Registrar vehículo</Button>
        }
      />

      {aviso && (
        <Notice tone="success" className="mb-4">
          {aviso}
        </Notice>
      )}
      {error && (
        <Notice tone="error" className="mb-4">
          {error}
        </Notice>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative w-full sm:w-80">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-off"
          />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por placa, VIN, alias o responsable"
            aria-label="Buscar vehículo por placa, VIN, alias o responsable"
            className="pl-9"
          />
        </div>
        {puedeGestionar && (
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={verBajas}
              onChange={(e) => setVerBajas(e.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            Mostrar vehículos dados de baja
          </label>
        )}
      </div>

      <Panel flush>
        {loading ? (
          <p className="p-5 text-sm text-ink-3">Cargando vehículos…</p>
        ) : vehicles.length === 0 ? (
          <EmptyState title="Todavía no hay vehículos registrados">
            {puedeGestionar
              ? 'Use «Registrar vehículo» para agregar el primero.'
              : 'El administrador debe registrar los vehículos de la flota.'}
          </EmptyState>
        ) : filtrados.length === 0 ? (
          <EmptyState title={`Ningún vehículo coincide con «${busqueda.trim()}»`}>
            Revise la placa o borre la búsqueda para ver toda la flota.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-app text-xs font-medium text-ink-3">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Placa
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Vehículo
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Número de chasis (VIN)
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Responsable
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Escaneos
                  </th>
                  {puedeGestionar && (
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtrados.map((v) => {
                  const deBaja = v.active === false;
                  return (
                    <tr key={v.id} className={deBaja ? 'bg-app' : 'hover:bg-app'}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/vehicles/${v.id}`}
                          className={`code font-semibold hover:underline ${deBaja ? 'text-ink-3' : 'text-navy'}`}
                        >
                          {v.plate}
                        </Link>
                        <div className="text-xs text-ink-3">{v.alias || 'Sin alias'}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-2">
                        {descripcionVehiculo(v) || 'Sin datos'}
                      </td>
                      <td className="px-4 py-3">
                        {v.vin ? (
                          <span className="code text-xs text-ink-2">{v.vin}</span>
                        ) : (
                          <span className="text-xs text-ink-3">No registrado</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.responsible ? (
                          <span className="text-ink">{v.responsible.name}</span>
                        ) : (
                          <span className="text-xs text-ink-3">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {deBaja ? <Tag>Dado de baja</Tag> : <VehicleStatusBadge status={v.status} />}
                      </td>
                      <td className="nums px-4 py-3 text-right text-ink-2">
                        {v._count?.scans ?? 0}
                      </td>
                      {puedeGestionar && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {deBaja ? (
                              <Button variant="secondary" size="sm" onClick={() => reactivar(v)}>
                                Reactivar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => abrirEdicion(v)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setPorDarDeBaja(v)}
                                >
                                  Dar de baja
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? `Editar vehículo ${editingVehicle.plate}` : 'Registrar vehículo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORM} disabled={guardando}>
              {guardando
                ? 'Guardando…'
                : editingVehicle
                  ? 'Guardar cambios'
                  : 'Registrar vehículo'}
            </Button>
          </>
        }
      >
        <form id={ID_FORM} onSubmit={guardar} className="space-y-4">
          {errorForm && <Notice tone="error">{errorForm}</Notice>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Placa">
              {(id) => (
                <Input id={id} required placeholder="5521-TAC" className="code" {...campo('plate')} />
              )}
            </Field>
            <Field label="Año">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  placeholder="2021"
                  {...campo('year')}
                />
              )}
            </Field>
          </div>

          <Field
            label="Número de chasis (VIN)"
            hint="Opcional. Son 17 caracteres; algunos vehículos no lo informan al escáner."
          >
            {(id) => (
              <Input
                id={id}
                placeholder="5TFCZ5AN3MX255216"
                className="code"
                {...campo('vin')}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              {(id) => <Input id={id} placeholder="Toyota" {...campo('make')} />}
            </Field>
            <Field label="Modelo">
              {(id) => <Input id={id} placeholder="Tacoma" {...campo('model')} />}
            </Field>
          </div>

          <Field label="Alias o unidad asignada" hint="El nombre con que se lo conoce en la universidad.">
            {(id) => (
              <Input
                id={id}
                placeholder="Camioneta de Ciencias Agrícolas"
                {...campo('alias')}
              />
            )}
          </Field>

          {puedeVerUsuarios && (
            <Field
              label="Responsable"
              hint="Inspector que recibe los avisos cuando el vehículo necesita revisión."
            >
              {(id) => (
                <Select id={id} {...campo('responsibleId')}>
                  <option value="">Sin asignar</option>
                  {/* Si el responsable actual ya no es candidato (desactivado o
                      con otro rol), se lo muestra igual para no perderlo en
                      silencio al guardar. */}
                  {editingVehicle?.responsible &&
                    !inspectores.some((u) => u.id === editingVehicle.responsible?.id) && (
                      <option value={editingVehicle.responsible.id}>
                        {editingVehicle.responsible.name}
                      </option>
                    )}
                  {inspectores.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </form>
      </Dialog>

      <ConfirmDialog
        open={porDarDeBaja !== null}
        title="Dar de baja el vehículo"
        confirmLabel="Dar de baja"
        destructive
        busy={dandoDeBaja}
        onConfirm={darDeBaja}
        onCancel={() => setPorDarDeBaja(null)}
      >
        El vehículo <span className="code font-semibold text-ink">{porDarDeBaja?.plate}</span>{' '}
        dejará de aparecer en la flota. Sus escaneos y órdenes se conservan, y puede
        reactivarlo cuando quiera.
      </ConfirmDialog>
    </div>
  );
}
