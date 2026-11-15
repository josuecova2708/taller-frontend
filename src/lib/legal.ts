/**
 * Textos de la política de privacidad y de los términos de uso.
 *
 * La app móvil tiene una copia en `taller-mobile/lib/features/legal/legal_texts.dart`:
 * si se cambia uno, cambiar también el otro.
 */

export interface SeccionLegal {
  titulo: string;
  parrafos?: string[];
  vinetas?: string[];
}

export interface DocumentoLegal {
  titulo: string;
  actualizado: string;
  introduccion: string;
  secciones: SeccionLegal[];
}

export const ACTUALIZADO = '15/11/2026';

export const PRIVACIDAD: DocumentoLegal = {
  titulo: 'Política de privacidad',
  actualizado: ACTUALIZADO,
  introduccion:
    'Esta política explica qué datos guarda el sistema de diagnóstico vehicular preventivo del parque automotor de la Universidad Autónoma Gabriel René Moreno (UAGRM), para qué los usa y con quién los comparte. Se aplica a la plataforma web y a la aplicación móvil.',
  secciones: [
    {
      titulo: 'Responsable',
      parrafos: [
        'El responsable de los datos es el administrador del sistema del parque automotor de la UAGRM. Las consultas sobre esta política se le dirigen a él.',
      ],
    },
    {
      titulo: 'Qué datos se guardan',
      vinetas: [
        'De su cuenta: nombre, correo electrónico, rol y la contraseña cifrada (nunca se guarda tal como se escribe).',
        'De los vehículos: placa, número de chasis (VIN), marca, modelo y año.',
        'De cada escaneo: códigos de falla, voltaje de la batería, estado de los monitores del vehículo, la observación del inspector, quién lo hizo y cuándo.',
        'De las órdenes de trabajo: descripción, notas de avance, a quién está asignada, quién la cerró y cuándo.',
        'De su teléfono: un identificador que entrega Firebase para enviarle notificaciones. Se borra al cerrar sesión.',
      ],
    },
    {
      titulo: 'Qué no se guarda',
      vinetas: [
        'Los valores del monitor en vivo: se muestran solo en el teléfono y se descartan al cerrarlo.',
        'Su ubicación. Android exige el permiso de ubicación para buscar dispositivos Bluetooth, pero la aplicación no la lee ni la envía.',
      ],
    },
    {
      titulo: 'Para qué se usan',
      parrafos: [
        'Para el mantenimiento preventivo de los vehículos de la universidad: registrar los escaneos, detectar fallas, generar y seguir órdenes de trabajo, avisar al personal responsable y emitir reportes. No se usan con fines comerciales.',
      ],
    },
    {
      titulo: 'Con quién se comparten',
      parrafos: ['El sistema se apoya en estos servicios externos:'],
      vinetas: [
        'Anthropic (inteligencia artificial): recibe los datos del vehículo y del escaneo para proponer una hipótesis técnica. No recibe nombres ni correos de personas.',
        'Firebase, de Google: entrega las notificaciones push al teléfono.',
        'n8n, Telegram y correo electrónico: envían los avisos de órdenes nuevas y el resumen diario.',
        'Neon: aloja la base de datos.',
        'Microsoft Azure: aloja el servidor.',
      ],
    },
    {
      titulo: 'Cuánto tiempo se conservan',
      parrafos: [
        'Mientras sirvan al mantenimiento del parque automotor. Dar de baja un vehículo o desactivar una cuenta no borra su historial, porque los escaneos y las órdenes son el registro técnico de cada vehículo.',
      ],
    },
    {
      titulo: 'Sus derechos',
      parrafos: [
        'Puede pedir al administrador que le muestre o corrija sus datos, o que desactive su cuenta.',
      ],
    },
    {
      titulo: 'Seguridad',
      parrafos: [
        'Las contraseñas se guardan cifradas, las conexiones viajan cifradas y cada persona accede solo a lo que su rol permite.',
      ],
    },
    {
      titulo: 'Cambios',
      parrafos: [
        'Si esta política cambia, la versión nueva se publica en esta misma página con su fecha de actualización.',
      ],
    },
  ],
};

export const TERMINOS: DocumentoLegal = {
  titulo: 'Términos de uso',
  actualizado: ACTUALIZADO,
  introduccion:
    'Estos términos rigen el uso de la plataforma web y de la aplicación móvil de diagnóstico vehicular preventivo de la UAGRM. Al iniciar sesión, usted los acepta.',
  secciones: [
    {
      titulo: 'Quién puede usarlo',
      parrafos: [
        'El sistema es de uso exclusivo del personal autorizado de la UAGRM. Las cuentas las crea el administrador del sistema.',
      ],
    },
    {
      titulo: 'Su cuenta',
      parrafos: [
        'La cuenta es personal. No comparta su contraseña: cada escaneo, nota y cierre de orden queda registrado a nombre de quien inició sesión.',
      ],
    },
    {
      titulo: 'La hipótesis de inteligencia artificial',
      parrafos: [
        'La hipótesis que genera la inteligencia artificial es orientativa y no reemplaza la revisión de un mecánico. La decisión técnica es siempre de una persona, y solo quien tiene ese permiso autoriza que un vehículo vuelva a operar.',
      ],
    },
    {
      titulo: 'El escaneo',
      vinetas: [
        'Conecte el adaptador con el vehículo detenido y en condiciones seguras.',
        'Verifique que el vehículo elegido sea el que está escaneando.',
        'Que no aparezcan códigos de falla no garantiza que el vehículo esté en buen estado.',
      ],
    },
    {
      titulo: 'Usos no permitidos',
      parrafos: [
        'No está permitido alterar datos a sabiendas, usar la cuenta de otra persona ni intentar acceder a funciones que su rol no permite. El administrador puede desactivar la cuenta de quien incumpla estos términos.',
      ],
    },
    {
      titulo: 'Disponibilidad',
      parrafos: [
        'El sistema puede tener interrupciones por mantenimiento o por fallas de los servicios externos de los que depende.',
      ],
    },
    {
      titulo: 'Carácter académico',
      parrafos: [
        'El sistema se desarrolló como trabajo de grado y puede cambiar. Los cambios en estos términos se publican en esta misma página con su fecha de actualización.',
      ],
    },
  ],
};
