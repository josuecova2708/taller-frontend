export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">Vista general de la flota vehicular</p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status Cards */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="text-3xl">🚗</div>
          <h3 className="mt-2 text-sm font-medium text-gray-500">Total Vehículos</h3>
          <p className="text-2xl font-bold text-gray-900">--</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="text-3xl">🟢</div>
          <h3 className="mt-2 text-sm font-medium text-gray-500">Estado OK</h3>
          <p className="text-2xl font-bold text-green-600">--</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="text-3xl">🟡</div>
          <h3 className="mt-2 text-sm font-medium text-gray-500">Con Alerta</h3>
          <p className="text-2xl font-bold text-yellow-600">--</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="text-3xl">🔴</div>
          <h3 className="mt-2 text-sm font-medium text-gray-500">Críticos</h3>
          <p className="text-2xl font-bold text-red-600">--</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Últimos Escaneos</h2>
        <div className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <p className="text-gray-500">Los escaneos aparecerán aquí cuando se conecte la app móvil.</p>
        </div>
      </div>
    </div>
  );
}
