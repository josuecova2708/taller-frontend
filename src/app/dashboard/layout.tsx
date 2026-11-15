import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/auth-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-app">
        <Sidebar />
        {/* En pantallas angostas la barra lateral se pliega y el contenido
            ocupa todo el ancho. */}
        <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
