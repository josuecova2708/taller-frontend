/**
 * Formas que devuelve el backend.
 *
 * Se centralizan acá porque la hipótesis de IA dejó de ser un arreglo de
 * strings: ahora es un objeto estructurado, y tenerlo tipeado en un solo lugar
 * evita que una página lo renderice como lista y lo oculte en silencio.
 */

export type ScanSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VehicleStatus = 'OK' | 'ALERT' | 'CRITICAL';
export type DtcType = 'CONFIRMED' | 'PENDING' | 'PERMANENT';
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DtcEntry {
  id: string;
  code: string;
  type: DtcType;
  description?: string;
}

export interface ReadinessStatus {
  milOn?: boolean;
  dtcCount?: number;
  monitorsCompleted?: boolean;
  incompleteMonitors?: string[];
  batteryResetSuspected?: boolean;
  /** Motor de encendido por compresión (diésel), del byte B bit 3. */
  compressionIgnition?: boolean;
  rawHex?: string;
}

/** Protocolo OBD-II detectado con `ATDPN`. */
export interface Protocol {
  number?: string | null;
  automatic?: boolean;
  isCan?: boolean;
  label?: string;
  raw?: string;
}

export interface ProbableCause {
  cause: string;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
}

/**
 * Parte estructurada de la hipótesis, guardada en la columna JSON
 * `Diagnosis.recommendations`.
 */
export interface DiagnosisRecommendations {
  probableCauses: ProbableCause[];
  verificationSteps: string[];
  correlations: string | null;
}

export interface Diagnosis {
  id: string;
  provider: string;
  summary: string;
  severity: ScanSeverity;
  recommendations: DiagnosisRecommendations;
  tokensUsed: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface VehicleSummary {
  id?: string;
  plate: string;
  alias: string | null;
  make: string | null;
  model: string | null;
  year?: number | null;
  vin?: string | null;
  status?: VehicleStatus;
}

/** Vehículo tal como lo devuelve `GET /vehicles`: con su último escaneo. */
export interface FleetVehicle extends VehicleSummary {
  id: string;
  status: VehicleStatus;
  active?: boolean;
  createdAt: string;
  scans?: Array<{
    id: string;
    scannedAt: string;
    severity: ScanSeverity;
    notes: string | null;
    rationale?: string | null;
    dtcEntries: DtcEntry[];
  }>;
  _count?: { scans: number; workOrders: number };
}

/** Escaneo tal como viene dentro de la ficha de un vehículo. */
export interface VehicleScan {
  id: string;
  scannedAt: string;
  severity: ScanSeverity;
  batteryVoltage: number | null;
  notes: string | null;
  rationale?: string | null;
  readinessStatus: ReadinessStatus | null;
  dtcEntries: DtcEntry[];
  scannedBy: { name: string } | null;
}

/** Ficha de un vehículo (`GET /vehicles/:id`): todo su historial. */
export interface VehicleDetail extends VehicleSummary {
  id: string;
  status: VehicleStatus;
  active?: boolean;
  createdAt: string;
  scans: VehicleScan[];
  workOrders: Array<{
    id: string;
    status: WorkOrderStatus;
    priority: WorkOrderPriority;
    description: string;
    createdAt: string;
    assignedTo: { id: string; name: string } | null;
  }>;
}

export interface Scan {
  id: string;
  vehicleId: string;
  batteryVoltage: number | null;
  scannedAt: string;
  severity: ScanSeverity;
  /** Observación escrita por el inspector. */
  notes: string | null;
  /** Dictamen de las reglas determinísticas. */
  rationale?: string | null;
  aiProcessed: boolean;
  readinessStatus: ReadinessStatus | null;
  protocol: Protocol | null;
  vehicle: VehicleSummary;
  scannedBy: { name: string; email: string } | null;
  dtcEntries: DtcEntry[];
  diagnosis?: Diagnosis | null;
  workOrder?: { id: string; status: WorkOrderStatus; priority: WorkOrderPriority } | null;
}

export interface WorkOrder {
  id: string;
  scanId: string;
  vehicleId: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string;
  notes: string | null;
  n8nNotified: boolean;
  closedAt?: string | null;
  operationAuthorized?: boolean;
  closedBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: VehicleSummary;
  diagnosis?: Diagnosis | null;
  scan?: { id: string; scannedAt: string; dtcEntries: DtcEntry[] } | null;
  assignedTo?: { id: string; name: string; email: string; role: string } | null;
}

/**
 * Estado de la hipótesis de un escaneo.
 *
 * La hipótesis se genera en segundo plano, así que un escaneo puede estar
 * esperándola. La interfaz necesita distinguir "todavía no llegó" de "no
 * corresponde" para saber si debe seguir refrescando.
 */
export type DiagnosisState = 'lista' | 'generando' | 'no-requerida' | 'fallida';

export function diagnosisState(scan: Scan): DiagnosisState {
  if (scan.diagnosis) return 'lista';

  // El filtro determinístico solo escala a IA desde MEDIUM en adelante.
  const requeria = ['MEDIUM', 'HIGH', 'CRITICAL'].includes(scan.severity);
  if (!requeria) return 'no-requerida';

  return scan.aiProcessed ? 'fallida' : 'generando';
}

/**
 * Dictamen determinístico de un escaneo.
 *
 * Los escaneos anteriores a la separación de columnas lo guardaban en `notes`.
 */
export function dictamenDe(scan: Pick<Scan, 'notes' | 'rationale'>): string | null {
  return scan.rationale ?? scan.notes ?? null;
}

/** Observación del inspector, solo cuando es distinta del dictamen. */
export function observacionDe(scan: Pick<Scan, 'notes' | 'rationale'>): string | null {
  if (!scan.rationale || !scan.notes) return null;
  return scan.notes === scan.rationale ? null : scan.notes;
}
