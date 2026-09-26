export default function VehiclesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="mt-1 text-gray-500">Gestión de la flota vehicular</p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Agregar Vehículo
        </button>
      </div>

      <div className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="p-6">
          <p className="text-gray-500">La lista de vehículos se implementará en la Fase 2.</p>
        </div>
      </div>
    </div>
  );
}
