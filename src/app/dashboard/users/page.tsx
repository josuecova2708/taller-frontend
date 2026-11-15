'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { mensajeDeError } from '@/lib/errors';
import { fecha } from '@/lib/format';
import { Tag } from '@/components/Badges';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, PageHeader, Panel } from '@/components/ui/Panel';

type Rol = 'INSPECTOR' | 'MECHANIC' | 'ADMIN';

interface Usuario {
  id: string;
  email: string;
  name: string;
  role: Rol;
  roleLabel: string;
  active: boolean;
  createdAt: string;
}

const ROLES: Array<{ valor: Rol; etiqueta: string; ayuda: string }> = [
  { valor: 'INSPECTOR', etiqueta: 'Inspector', ayuda: 'Escanea vehículos y consulta la flota.' },
  { valor: 'MECHANIC', etiqueta: 'Mecánico', ayuda: 'Atiende las órdenes de trabajo que se le asignan.' },
  { valor: 'ADMIN', etiqueta: 'Administrador', ayuda: 'Gestiona usuarios, vehículos y órdenes, y autoriza la operación.' },
];

const FORM_VACIO = { name: '', email: '', role: 'INSPECTOR' as Rol, password: '' };
const ID_FORM = 'form-usuario';
const ID_FORM_CLAVE = 'form-clave';

const pedirUsuarios = () => api.get<Usuario[]>('/auth/users');

export default function UsersPage() {
  const { user, loading: authLoading, can } = useAuth();
  const puedeGestionar = can(Permission.USER_MANAGE);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [cambiandoClave, setCambiandoClave] = useState<Usuario | null>(null);
  const [clave, setClave] = useState('');
  const [porDesactivar, setPorDesactivar] = useState<Usuario | null>(null);

  useEffect(() => {
    if (authLoading || !puedeGestionar) return;
    pedirUsuarios()
      .then(({ data }) => setUsuarios(data))
      .catch((err) => setError(mensajeDeError(err, 'No se pudieron cargar los usuarios.')))
      .finally(() => setLoading(false));
  }, [authLoading, puedeGestionar]);

  const recargar = async () => {
    const { data } = await pedirUsuarios();
    setUsuarios(data);
  };

  const abrirAlta = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setErrorForm('');
    setModalOpen(true);
  };

  const abrirEdicion = (u: Usuario) => {
    setEditando(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setErrorForm('');
    setModalOpen(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      if (editando) {
        await api.patch(`/auth/users/${editando.id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
        });
        setAviso(`Se guardaron los cambios de ${form.name}.`);
      } else {
        await api.post('/auth/register', form);
        setAviso(
          `Cuenta creada para ${form.name}. Entréguele su correo y la contraseña inicial.`,
        );
      }
      setModalOpen(false);
      await recargar();
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo guardar el usuario.'));
    } finally {
      setGuardando(false);
    }
  };

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault();
    if (!cambiandoClave) return;
    setGuardando(true);
    setErrorForm('');
    try {
      await api.patch(`/auth/users/${cambiandoClave.id}/password`, { password: clave });
      setAviso(
        `Contraseña de ${cambiandoClave.name} restablecida. Entréguele la nueva contraseña.`,
      );
      setCambiandoClave(null);
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo restablecer la contraseña.'));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (u: Usuario, active: boolean) => {
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await api.patch(`/auth/users/${u.id}/active`, { active });
      setAviso(
        active
          ? `La cuenta de ${u.name} volvió a estar activa.`
          : `La cuenta de ${u.name} fue desactivada. Ya no puede iniciar sesión.`,
      );
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cambiar el estado de la cuenta.'));
    } finally {
      setGuardando(false);
      setPorDesactivar(null);
    }
  };

  if (!authLoading && !puedeGestionar) {
    return (
      <div>
        <PageHeader title="Usuarios" />
        <Notice tone="error">Su rol no tiene permiso para gestionar usuarios.</Notice>
      </div>
    );
  }

  const rolElegido = ROLES.find((r) => r.valor === form.role);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Cuentas de las personas que usan el sistema y el rol de cada una."
        actions={<Button onClick={abrirAlta}>Crear usuario</Button>}
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

      <Panel flush>
        {loading ? (
          <p className="p-5 text-sm text-ink-3">Cargando usuarios…</p>
        ) : usuarios.length === 0 ? (
          <EmptyState title="No hay usuarios para mostrar" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-app text-xs text-ink-3">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Correo
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Alta
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {usuarios.map((u) => {
                  const esUnoMismo = u.id === user?.id;
                  return (
                    <tr key={u.id} className={u.active ? 'hover:bg-app' : 'bg-app'}>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${u.active ? 'text-ink' : 'text-ink-3'}`}>
                          {u.name}
                        </span>
                        {esUnoMismo && <span className="ml-2 text-xs text-ink-3">(usted)</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{u.email}</td>
                      <td className="px-4 py-3 text-ink-2">{u.roleLabel}</td>
                      <td className="px-4 py-3">
                        {u.active ? <Tag tone="marca">Activa</Tag> : <Tag>Desactivada</Tag>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{fecha(u.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {u.active ? (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => abrirEdicion(u)}>
                                Editar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setClave('');
                                  setErrorForm('');
                                  setCambiandoClave(u);
                                }}
                              >
                                Restablecer contraseña
                              </Button>
                              {!esUnoMismo && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setPorDesactivar(u)}
                                >
                                  Desactivar
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={guardando}
                              onClick={() => cambiarEstado(u, true)}
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
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
        title={editando ? `Editar a ${editando.name}` : 'Crear usuario'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORM} disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form id={ID_FORM} onSubmit={guardar} className="space-y-4">
          {errorForm && modalOpen && <Notice tone="error">{errorForm}</Notice>}

          <Field label="Nombre completo">
            {(id) => (
              <Input
                id={id}
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            )}
          </Field>

          <Field label="Correo" hint="Es el dato con el que inicia sesión.">
            {(id) => (
              <Input
                id={id}
                type="email"
                required
                autoComplete="off"
                placeholder="nombre@uagrm.edu.bo"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            )}
          </Field>

          <Field
            label="Rol"
            hint={
              editando?.id === user?.id
                ? 'No puede cambiar su propio rol.'
                : rolElegido?.ayuda
            }
          >
            {(id) => (
              <Select
                id={id}
                value={form.role}
                disabled={editando?.id === user?.id}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Rol }))}
              >
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.etiqueta}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {!editando && (
            <Field
              label="Contraseña inicial"
              hint="Mínimo 6 caracteres. Usted se la entrega a la persona."
            >
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  required
                  minLength={6}
                  autoComplete="off"
                  className="code"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              )}
            </Field>
          )}
        </form>
      </Dialog>

      <Dialog
        open={cambiandoClave !== null}
        onClose={() => setCambiandoClave(null)}
        title="Restablecer contraseña"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCambiandoClave(null)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORM_CLAVE} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Restablecer contraseña'}
            </Button>
          </>
        }
      >
        <form id={ID_FORM_CLAVE} onSubmit={guardarClave} className="space-y-4">
          {errorForm && cambiandoClave && <Notice tone="error">{errorForm}</Notice>}
          <p className="text-sm text-ink-2">
            La contraseña actual de{' '}
            <span className="font-semibold text-ink">{cambiandoClave?.name}</span> dejará de
            funcionar.
          </p>
          <Field
            label="Contraseña nueva"
            hint="Mínimo 6 caracteres. Usted se la entrega a la persona."
          >
            {(id) => (
              <Input
                id={id}
                type="text"
                required
                minLength={6}
                autoComplete="off"
                className="code"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            )}
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={porDesactivar !== null}
        title="Desactivar cuenta"
        confirmLabel="Desactivar"
        destructive
        busy={guardando}
        onConfirm={() => porDesactivar && cambiarEstado(porDesactivar, false)}
        onCancel={() => setPorDesactivar(null)}
      >
        <span className="font-semibold text-ink">{porDesactivar?.name}</span> ya no podrá
        iniciar sesión. Sus escaneos y órdenes se conservan, y puede reactivar la cuenta
        cuando quiera.
      </ConfirmDialog>
    </div>
  );
}
