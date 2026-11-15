/**
 * Reportes PDF (CU20): escaneo, ficha del vehículo y orden de trabajo.
 *
 * Este módulo solo se carga cuando alguien pulsa «Descargar PDF» (importación
 * diferida desde `ReportButton`), así la librería no pesa en el resto de la web.
 */
import type { ReactNode } from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { descripcionVehiculo, fecha, fechaHora } from '@/lib/format';
import {
  dictamenDe,
  observacionDe,
  type Diagnosis,
  type DtcEntry,
  type Scan,
  type VehicleDetail,
  type WorkOrder,
} from '@/lib/types';

const NAVY = '#000878';
const CRIMSON = '#8a0817';
const INK = '#0f172a';
const INK_2 = '#475569';
const LINE = '#e2e8f0';

const SEVERIDAD: Record<string, string> = {
  NONE: 'Sin fallas',
  LOW: 'Leve',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};
const ESTADO_VEHICULO: Record<string, string> = {
  OK: 'Operativo',
  ALERT: 'En seguimiento',
  CRITICAL: 'Requiere evaluación',
};
const ESTADO_ORDEN: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};
const PRIORIDAD: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};
const TIPO_CODIGO: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendiente',
  PERMANENT: 'Permanente',
};
const CONFIANZA: Record<string, string> = { ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' };

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    lineHeight: 1.4,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  escudo: { width: 44, height: 43, marginRight: 12 },
  institucion: { fontSize: 9, color: INK_2 },
  sistema: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  filete: { flexDirection: 'row', height: 2, marginBottom: 16 },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1.25 },
  subtitulo: { fontSize: 10, color: INK_2, marginTop: 4, marginBottom: 12 },
  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    paddingBottom: 3,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  datos: { flexDirection: 'row', flexWrap: 'wrap' },
  dato: { width: '50%', marginBottom: 6, paddingRight: 8 },
  rotulo: { fontSize: 8, color: INK_2 },
  valor: { fontSize: 10 },
  fila: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  encabezadoFila: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: INK_2 },
  codigo: { fontFamily: 'Courier-Bold' },
  aviso: {
    borderWidth: 1,
    borderColor: '#b45309',
    backgroundColor: '#fef3c7',
    padding: 7,
    marginBottom: 8,
    fontSize: 9,
  },
  negrita: { fontFamily: 'Helvetica-Bold' },
  item: { flexDirection: 'row', marginBottom: 3 },
  vineta: { width: 16 },
  pie: {
    position: 'absolute',
    bottom: 26,
    fontSize: 8,
    color: INK_2,
  },
});

interface Contexto {
  /** Dirección del escudo, absoluta: el PDF se arma fuera del árbol de la página. */
  escudo: string;
  generadoPor: string;
}

function Hoja({
  ctx,
  titulo,
  subtitulo,
  children,
}: {
  ctx: Contexto;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <Document title={titulo} author="UAGRM · Diagnóstico vehicular">
      <Page size="LETTER" style={s.page}>
        <View style={s.header} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- es la imagen de un PDF, no HTML */}
          <Image src={ctx.escudo} style={s.escudo} />
          <View>
            <Text style={s.institucion}>Universidad Autónoma Gabriel René Moreno</Text>
            <Text style={s.sistema}>Diagnóstico vehicular preventivo</Text>
          </View>
        </View>
        <View style={s.filete} fixed>
          <View style={{ flex: 1, backgroundColor: NAVY }} />
          <View style={{ flex: 1, backgroundColor: CRIMSON }} />
        </View>

        <Text style={[s.pie, { left: 40 }]} fixed>
          Generado el {fechaHora(new Date())} por {ctx.generadoPor}
        </Text>

        <Text style={s.titulo}>{titulo}</Text>
        <Text style={s.subtitulo}>{subtitulo}</Text>

        {children}
      </Page>
    </Document>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Datos({ pares }: { pares: Array<[string, string]> }) {
  return (
    <View style={s.datos}>
      {pares.map(([rotulo, valor]) => (
        <View key={rotulo} style={s.dato}>
          <Text style={s.rotulo}>{rotulo}</Text>
          <Text style={s.valor}>{valor}</Text>
        </View>
      ))}
    </View>
  );
}

function TablaCodigos({ codigos }: { codigos: DtcEntry[] }) {
  if (codigos.length === 0) {
    return <Text>El vehículo no reportó ningún código de falla.</Text>;
  }
  return (
    <View>
      <View style={s.fila}>
        <Text style={[s.encabezadoFila, { width: '16%' }]}>Código</Text>
        <Text style={[s.encabezadoFila, { width: '20%' }]}>Tipo</Text>
        <Text style={[s.encabezadoFila, { width: '64%' }]}>Descripción</Text>
      </View>
      {codigos.map((d) => (
        <View key={d.id} style={s.fila} wrap={false}>
          <Text style={[s.codigo, { width: '16%' }]}>{d.code}</Text>
          <Text style={{ width: '20%' }}>{TIPO_CODIGO[d.type] ?? d.type}</Text>
          <Text style={{ width: '64%' }}>{d.description ?? 'Sin descripción en el catálogo'}</Text>
        </View>
      ))}
    </View>
  );
}

function BloqueHipotesis({ d }: { d: Diagnosis }) {
  const r = d.recommendations;
  return (
    <Seccion titulo="Hipótesis técnica asistida por IA">
      <Text style={s.aviso}>
        <Text style={s.negrita}>Requiere validación de un profesional. </Text>
        Son hipótesis por verificar, no un diagnóstico confirmado. La decisión de autorizar la
        operación del vehículo es siempre de una persona.
      </Text>
      <Text>{d.summary}</Text>

      {r?.probableCauses?.length > 0 && (
        <View style={{ marginTop: 8 }} wrap={false}>
          <Text style={s.negrita}>Causas probables</Text>
          {r.probableCauses.map((c, i) => (
            <View key={i} style={s.item}>
              <Text style={s.vineta}>-</Text>
              <Text style={{ flex: 1 }}>
                {c.cause} (confianza {CONFIANZA[c.confidence] ?? c.confidence})
              </Text>
            </View>
          ))}
        </View>
      )}

      {r?.verificationSteps?.length > 0 && (
        <View style={{ marginTop: 8 }} wrap={false}>
          <Text style={s.negrita}>Pasos de verificación</Text>
          {r.verificationSteps.map((paso, i) => (
            <View key={i} style={s.item}>
              <Text style={s.vineta}>{i + 1}.</Text>
              <Text style={{ flex: 1 }}>{paso}</Text>
            </View>
          ))}
        </View>
      )}

      {r?.correlations && (
        <View style={{ marginTop: 8 }} wrap={false}>
          <Text style={s.negrita}>Relación entre los códigos</Text>
          <Text>{r.correlations}</Text>
        </View>
      )}
    </Seccion>
  );
}

export function ReporteEscaneo({ scan, ctx }: { scan: Scan; ctx: Contexto }) {
  const r = scan.readinessStatus;
  const monitoresOk = r?.monitorsCompleted ?? true;
  const dictamen = dictamenDe(scan);
  const observacion = observacionDe(scan);

  return (
    <Hoja
      ctx={ctx}
      titulo={`Reporte de escaneo · ${scan.vehicle.plate}`}
      subtitulo={[
        descripcionVehiculo(scan.vehicle),
        scan.vehicle.alias,
        fechaHora(scan.scannedAt),
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <Seccion titulo="Datos de la lectura">
        <Datos
          pares={[
            ['Severidad', SEVERIDAD[scan.severity] ?? scan.severity],
            ['Escaneado por', scan.scannedBy?.name ?? 'No registrado'],
            [
              'Voltaje de batería',
              scan.batteryVoltage !== null ? `${scan.batteryVoltage.toFixed(1)} V` : 'No medido',
            ],
            [
              'Luz de falla del tablero',
              r?.milOn === undefined ? 'Sin dato' : r.milOn ? 'Encendida' : 'Apagada',
            ],
            [
              'Monitores de preparación',
              monitoresOk
                ? 'Completos (lectura concluyente)'
                : `Incompletos: ${r?.incompleteMonitors?.join(', ') || 'no identificados'}`,
            ],
            ['Protocolo de comunicación', scan.protocol?.label ?? 'No registrado'],
          ]}
        />
      </Seccion>

      {dictamen && (
        <Seccion titulo="Evaluación automática">
          <Text>{dictamen}</Text>
        </Seccion>
      )}

      {observacion && (
        <Seccion titulo="Observación del inspector">
          <Text>{observacion}</Text>
        </Seccion>
      )}

      <Seccion titulo={`Códigos de falla (${scan.dtcEntries.length})`}>
        <TablaCodigos codigos={scan.dtcEntries} />
      </Seccion>

      {scan.diagnosis && <BloqueHipotesis d={scan.diagnosis} />}
    </Hoja>
  );
}

export function ReporteVehiculo({ vehiculo, ctx }: { vehiculo: VehicleDetail; ctx: Contexto }) {
  return (
    <Hoja
      ctx={ctx}
      titulo={`Ficha del vehículo · ${vehiculo.plate}`}
      subtitulo={
        [descripcionVehiculo(vehiculo), vehiculo.alias].filter(Boolean).join(' · ') ||
        'Sin descripción'
      }
    >
      <Seccion titulo="Datos del vehículo">
        <Datos
          pares={[
            [
              'Estado',
              vehiculo.active === false
                ? 'Dado de baja'
                : (ESTADO_VEHICULO[vehiculo.status] ?? vehiculo.status),
            ],
            ['Número de chasis (VIN)', vehiculo.vin ?? 'No registrado'],
            ['Registrado el', fecha(vehiculo.createdAt)],
            ['Escaneos registrados', String(vehiculo.scans.length)],
          ]}
        />
      </Seccion>

      <Seccion titulo="Historial de escaneos">
        {vehiculo.scans.length === 0 ? (
          <Text>Este vehículo todavía no fue escaneado.</Text>
        ) : (
          <View>
            <View style={s.fila}>
              <Text style={[s.encabezadoFila, { width: '26%' }]}>Fecha</Text>
              <Text style={[s.encabezadoFila, { width: '16%' }]}>Severidad</Text>
              <Text style={[s.encabezadoFila, { width: '30%' }]}>Códigos</Text>
              <Text style={[s.encabezadoFila, { width: '28%' }]}>Escaneado por</Text>
            </View>
            {vehiculo.scans.map((e) => (
              <View key={e.id} style={s.fila} wrap={false}>
                <Text style={{ width: '26%' }}>{fechaHora(e.scannedAt)}</Text>
                <Text style={{ width: '16%' }}>{SEVERIDAD[e.severity] ?? e.severity}</Text>
                <Text style={[{ width: '30%' }, e.dtcEntries.length > 0 ? s.codigo : {}]}>
                  {e.dtcEntries.length > 0
                    ? e.dtcEntries.map((d) => d.code).join(', ')
                    : 'Ninguno'}
                </Text>
                <Text style={{ width: '28%' }}>{e.scannedBy?.name ?? 'No registrado'}</Text>
              </View>
            ))}
          </View>
        )}
      </Seccion>

      <Seccion titulo="Órdenes de trabajo">
        {vehiculo.workOrders.length === 0 ? (
          <Text>Este vehículo no tiene órdenes de trabajo.</Text>
        ) : (
          <View>
            <View style={s.fila}>
              <Text style={[s.encabezadoFila, { width: '18%' }]}>Creada</Text>
              <Text style={[s.encabezadoFila, { width: '16%' }]}>Estado</Text>
              <Text style={[s.encabezadoFila, { width: '14%' }]}>Prioridad</Text>
              <Text style={[s.encabezadoFila, { width: '52%' }]}>Motivo</Text>
            </View>
            {vehiculo.workOrders.map((o) => (
              <View key={o.id} style={s.fila} wrap={false}>
                <Text style={{ width: '18%' }}>{fecha(o.createdAt)}</Text>
                <Text style={{ width: '16%' }}>{ESTADO_ORDEN[o.status] ?? o.status}</Text>
                <Text style={{ width: '14%' }}>{PRIORIDAD[o.priority] ?? o.priority}</Text>
                <Text style={{ width: '52%' }}>{o.description}</Text>
              </View>
            ))}
          </View>
        )}
      </Seccion>
    </Hoja>
  );
}

export function ReporteOrden({ orden, ctx }: { orden: WorkOrder; ctx: Contexto }) {
  const cerrada = orden.status === 'COMPLETED' || orden.status === 'CANCELLED';

  return (
    <Hoja
      ctx={ctx}
      titulo={`Orden de trabajo · ${orden.vehicle?.plate ?? ''}`}
      subtitulo={[orden.vehicle?.alias, `Creada el ${fechaHora(orden.createdAt)}`]
        .filter(Boolean)
        .join(' · ')}
    >
      <Seccion titulo="Datos de la orden">
        <Datos
          pares={[
            ['Estado', ESTADO_ORDEN[orden.status] ?? orden.status],
            ['Prioridad', PRIORIDAD[orden.priority] ?? orden.priority],
            ['Mecánico asignado', orden.assignedTo?.name ?? 'Sin asignar'],
            [
              'Estado del vehículo',
              orden.vehicle?.status
                ? (ESTADO_VEHICULO[orden.vehicle.status] ?? orden.vehicle.status)
                : 'Sin dato',
            ],
          ]}
        />
      </Seccion>

      <Seccion titulo="Motivo">
        <Text>{orden.description}</Text>
      </Seccion>

      {orden.scan && (
        <Seccion titulo={`Escaneo que originó la orden (${fechaHora(orden.scan.scannedAt)})`}>
          <TablaCodigos codigos={orden.scan.dtcEntries ?? []} />
        </Seccion>
      )}

      {orden.diagnosis && <BloqueHipotesis d={orden.diagnosis} />}

      <Seccion titulo="Historial de notas">
        <Text>{orden.notes ?? 'Sin notas registradas.'}</Text>
      </Seccion>

      {cerrada && (
        <Seccion titulo="Cierre">
          <Datos
            pares={[
              ['Cerrada el', orden.closedAt ? fechaHora(orden.closedAt) : 'Sin dato'],
              ['Cerrada por', orden.closedBy?.name ?? 'Sin dato'],
              [
                'Operación del vehículo',
                orden.operationAuthorized ? 'Autorizada' : 'No autorizada',
              ],
            ]}
          />
        </Seccion>
      )}
    </Hoja>
  );
}
