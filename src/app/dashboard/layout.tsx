import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/auth-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 bg-gray-50 p-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
