'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Vehículos', href: '/dashboard/vehicles', icon: '🚗' },
  { name: 'Escaneos', href: '/dashboard/scans', icon: '📡' },
  { name: 'Órdenes de Trabajo', href: '/dashboard/work-orders', icon: '🔧' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        <h1 className="text-lg font-bold">🔌 Taller OBD-II</h1>
      </div>
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
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
      <div className="absolute bottom-0 w-full border-t border-gray-700 p-4">
        <button
          className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={() => {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
