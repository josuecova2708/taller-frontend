'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Permission, type PermissionValue } from '@/lib/permissions';
import {
  IconClose,
  IconFleet,
  IconLogout,
  IconMenu,
  IconOrder,
  IconScan,
  IconUsers,
  IconVehicle,
} from '@/components/ui/icons';

const navigation: Array<{
  name: string;
  href: string;
  icon: ReactNode;
  permission: PermissionValue;
}> = [
  { name: 'Flota', href: '/dashboard', icon: <IconFleet />, permission: Permission.VEHICLE_READ },
  {
    name: 'Vehículos',
    href: '/dashboard/vehicles',
    icon: <IconVehicle />,
    permission: Permission.VEHICLE_READ,
  },
  {
    name: 'Escaneos',
    href: '/dashboard/scans',
    icon: <IconScan />,
    permission: Permission.SCAN_READ,
  },
  {
    name: 'Órdenes de trabajo',
    href: '/dashboard/work-orders',
    icon: <IconOrder />,
    permission: Permission.ORDER_READ,
  },
  {
    name: 'Usuarios',
    href: '/dashboard/users',
    icon: <IconUsers />,
    permission: Permission.USER_MANAGE,
  },
];

/**
 * La sección sigue marcada al entrar a una subpágina (el detalle de una
 * orden, por ejemplo). «Flota» es la raíz, así que solo coincide exacta.
 */
function estaActiva(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Marca() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <Image src="/logo2uagrm.png" alt="UAGRM" width={58} height={40} />
      <span className="text-sm font-semibold leading-tight text-navy">
        Diagnóstico
        <br />
        vehicular
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, can, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);

  // El menú se arma según los permisos efectivos del rol: un inspector no ve
  // la sección de órdenes de trabajo.
  const visibleItems = navigation.filter((item) => can(item.permission));

  return (
    <>
      {/* Barra superior, solo en pantallas angostas. */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Marca />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          className="rounded-control p-2 text-navy hover:bg-navy-soft"
        >
          <IconMenu />
        </button>
      </div>

      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Filete con los dos colores de las siglas. */}
        <div className="flex h-1 shrink-0" aria-hidden="true">
          <div className="flex-1 bg-navy" />
          <div className="flex-1 bg-crimson" />
        </div>

        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Marca />
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-control p-1.5 text-ink-3 hover:bg-navy-soft hover:text-navy lg:hidden"
          >
            <IconClose />
          </button>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto px-3" aria-label="Secciones">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const activa = estaActiva(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setAbierto(false)}
                    aria-current={activa ? 'page' : undefined}
                    className={`relative flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors ${
                      activa
                        ? 'bg-navy-soft font-semibold text-navy'
                        : 'font-medium text-ink-2 hover:bg-app hover:text-ink'
                    }`}
                  >
                    {activa && (
                      <span
                        className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-crimson"
                        aria-hidden="true"
                      />
                    )}
                    <span className={activa ? 'text-navy' : 'text-ink-off'}>{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line p-4">
          <div className="mb-3 px-1">
            <div className="truncate text-sm font-semibold text-ink">
              {loading ? 'Cargando…' : (user?.name ?? 'Sin sesión')}
            </div>
            <div className="truncate text-xs text-ink-3">{user?.roleLabel ?? ''}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-ink-2 hover:bg-app hover:text-ink"
          >
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
