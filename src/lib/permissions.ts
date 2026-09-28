/**
 * Espejo del catálogo de permisos del backend (`src/auth/permissions.ts`).
 *
 * Se usa únicamente para decidir qué mostrar en la interfaz. La autorización
 * real la aplica el backend: ocultar un botón no protege un endpoint.
 */
export const Permission = {
  USER_MANAGE: 'user:manage',
  VEHICLE_READ: 'vehicle:read',
  VEHICLE_WRITE: 'vehicle:write',
  SCAN_READ: 'scan:read',
  SCAN_CREATE: 'scan:create',
  DIAGNOSIS_READ: 'diagnosis:read',
  ORDER_READ: 'order:read',
  ORDER_CREATE: 'order:create',
  ORDER_ASSIGN: 'order:assign',
  ORDER_UPDATE_STATUS: 'order:update_status',
  ORDER_CLOSE: 'order:close',
  VEHICLE_AUTHORIZE: 'vehicle:authorize',
  REPORT_EXPORT: 'report:export',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];
