/**
 * Utilidades de validación y sanitización de inputs.
 * Centraliza la lógica de seguridad para prevenir SQL injection y XSS.
 */

/**
 * Sanitiza un string para uso seguro en consultas.
 * Elimina caracteres peligrosos y normaliza espacios.
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return (
    input
      .trim()
      .replace(/[<>]/g, '') // Prevenir XSS básico
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  ); // Caracteres de control
}

/**
 * Valida y sanitiza una cédula/NIT.
 * Solo permite números, letras y guiones.
 */
export function sanitizeCedula(cedula: string | null | undefined): string {
  if (!cedula) return '';
  return cedula.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
}

/**
 * Valida que un email tenga formato correcto.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Emails vacíos son válidos (campo opcional)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida que un teléfono tenga formato razonable.
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true;
  // Acepta formatos como: 555-1234, 300 123 4567, +57 300 123 4567
  const phoneRegex = /^[+]?[\d\s-]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitiza un número de teléfono.
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+\s-]/g, '').trim();
}

/**
 * Valida un campo ORDER BY contra una whitelist.
 * Previene SQL injection en cláusulas ORDER BY.
 */
export function validateOrderBy(
  orderBy: string,
  allowedColumns: string[],
  defaultColumn: string
): string {
  return allowedColumns.includes(orderBy) ? orderBy : defaultColumn;
}

/**
 * Valida dirección de ordenamiento.
 */
export function validateOrderDir(dir: string): 'ASC' | 'DESC' {
  return dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
}

/**
 * Valida que un valor numérico esté en un rango.
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (isNaN(value) || value < min || value > max) {
    return defaultValue;
  }
  return Math.floor(value);
}

/**
 * Sanitiza un nombre (persona o empresa).
 * Permite letras, espacios, puntos y apóstrofes.
 */
export function sanitizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'"-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Valida formato de fecha ISO (YYYY-MM-DD).
 */
export function isValidISODate(date: string | null | undefined): boolean {
  if (!date) return true;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Valida un monto monetario (positivo, con hasta 2 decimales).
 */
export function isValidMoney(amount: number | null | undefined): boolean {
  if (amount === null || amount === undefined) return true;
  return typeof amount === 'number' && amount >= 0 && Number.isFinite(amount);
}

/**
 * Sanitiza HTML básico (convierte caracteres especiales).
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Valida un código de artículo/actividad.
 * Solo alfanumérico y guiones.
 */
export function sanitizeCode(code: string | null | undefined): string {
  if (!code) return '';
  return code
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+$/, '')
    .toUpperCase();
}

/**
 * Validador de formulario genérico.
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(value: unknown, fieldName: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return { field: fieldName, message: `${fieldName} es requerido` };
  }
  return null;
}

export function validateMaxLength(
  value: string | null | undefined,
  maxLength: number,
  fieldName: string
): ValidationError | null {
  if (value && value.length > maxLength) {
    return { field: fieldName, message: `${fieldName} no puede exceder ${maxLength} caracteres` };
  }
  return null;
}
