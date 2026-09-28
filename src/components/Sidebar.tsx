'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Permission, type PermissionValue } from '@/lib/permissions';

const navigation: Array<{
  name: string;
  href: string;
  icon: string;
  permission: PermissionValue;
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', permission: Permission.VEHICLE_READ },
  { name: 'Vehículos', href: '/dashboard/vehicles', icon: '🚗', permission: Permission.VEHICLE_READ },
  { name: 'Escaneos', href: '/dashboard/scans', icon: '📡', permission: Permission.SCAN_READ },
  {
    name: 'Órdenes de Trabajo',
    href: '/dashboard/work-orders',
    icon: '🔧',
    permission: Permission.ORDER_READ,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, can, logout } = useAuth();

  // El menú se arma según los permisos efectivos del rol: un INSPECTOR no ve
  // la sección de órdenes de trabajo.
  const visibleItems = navigation.filter((item) => can(item.permission));

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-gray-700">
        <h1 className="text-lg font-bold">🔌 Taller OBD-II</h1>
      </div>

      <nav className="mt-6 flex-1 px-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-gray-700 p-4">
        <div className="mb-3 px-1">
          <div className="truncate text-sm font-medium text-white">
            {loading ? 'Cargando…' : (user?.name ?? 'Sin sesión')}
          </div>
          <div className="truncate text-xs text-gray-400">{user?.roleLabel ?? ''}</div>
        </div>
        <button
          className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={logout}
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
