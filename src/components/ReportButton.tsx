'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Scan, VehicleDetail, WorkOrder } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { IconDownload, Spinner } from '@/components/ui/icons';

type Props =
  | { tipo: 'escaneo'; datos: Scan }
  | { tipo: 'vehiculo'; datos: VehicleDetail }
  | { tipo: 'orden'; datos: WorkOrder };

function nombreArchivo(props: Props): string {
  const dia = new Date().toISOString().slice(0, 10);
  const placa =
    props.tipo === 'vehiculo'
      ? props.datos.plate
      : (props.datos.vehicle?.plate ?? 'sin-placa');
  return `${props.tipo}-${placa}-${dia}.pdf`;
}

/**
 * Descarga el reporte PDF de lo que se está viendo (CU20).
 *
 * El PDF se arma en el navegador con los datos ya cargados en la pantalla. La
 * librería se importa recién al pulsar, para no cargarla en cada visita.
 */
export function ReportButton(props: Props) {
  const { user } = useAuth();
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(false);

  const descargar = async () => {
    setGenerando(true);
    setError(false);
    try {
      const [{ pdf }, reportes] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/reportes'),
      ]);
      const ctx = {
        escudo: `${window.location.origin}/uagrm.jpg`,
        generadoPor: user?.name ?? 'usuario no identificado',
      };

      const documento =
        props.tipo === 'escaneo' ? (
          <reportes.ReporteEscaneo scan={props.datos} ctx={ctx} />
        ) : props.tipo === 'vehiculo' ? (
          <reportes.ReporteVehiculo vehiculo={props.datos} ctx={ctx} />
        ) : (
          <reportes.ReporteOrden orden={props.datos} ctx={ctx} />
        );

      const blob = await pdf(documento).toBlob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo(props);
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-danger">
          No se pudo generar el PDF. Intente de nuevo.
        </span>
      )}
      <Button variant="secondary" size="sm" onClick={descargar} disabled={generando}>
        {generando ? <Spinner /> : <IconDownload width={16} height={16} />}
        {generando ? 'Generando…' : 'Descargar PDF'}
      </Button>
    </span>
  );
}
