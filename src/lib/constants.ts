/**
 * Constantes globales de la aplicación SAGIM.
 */

/**
 * Tamaños de página para DataTable.
 * Usar estos valores en lugar de números mágicos para consistencia.
 */
export const PAGE_SIZE = {
  /** Para catálogos pequeños que se muestran completos (actividades, formas de pago, etc.) */
  CATALOG: 500,
  /** Para listas principales con muchos registros (clientes, caja) */
  LIST: 25,
  /** Para módulos de transacciones (compras, pagos instructores) */
  TRANSACTIONS: 20,
  /** Para tablas de detalle pequeñas (usuarios, medidas, cuotas) */
  DETAIL: 10,
} as const;

/**
 * Formatos de fecha para la aplicación.
 */
export const DATE_FORMAT = {
  /** Formato corto: 15/08/2026 */
  SHORT: "dd/MM/yyyy",
  /** Formato largo: 15 de agosto de 2026 */
  LONG: "d 'de' MMMM 'de' yyyy",
  /** Formato ISO: 2026-08-15 */
  ISO: "yyyy-MM-dd",
} as const;

/**
 * Estados comunes en la aplicación.
 */
export const ESTADO = {
  ACTIVO: "A",
  INACTIVO: "I",
  PENDIENTE: "P",
  CANCELADO: "C",
  ANULADO: "AN",
} as const;
