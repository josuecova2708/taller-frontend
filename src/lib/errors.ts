import { isAxiosError } from 'axios';

/** Código HTTP de un error de la API, si lo hay. */
export function estadoHttp(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}

/**
 * Mensaje que devolvió la API, listo para mostrar.
 *
 * El backend responde `message` como texto o como lista (errores de
 * validación); si no hay respuesta se usa el texto por defecto.
 */
export function mensajeDeError(err: unknown, porDefecto: string): string {
  if (isAxiosError(err)) {
    const mensaje = err.response?.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
    if (!err.response) {
      return 'No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.';
    }
  }
  return porDefecto;
}
