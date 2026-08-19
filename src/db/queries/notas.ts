/**
 * Queries para notas/alertas de clientes.
 * Permiten registrar observaciones internas por cliente
 * (lesiones, deudas, preferencias, alertas médicas, etc.)
 */
import { dbSelect, dbExecute } from '../useDb';
import type { NotaCliente } from '../types';

// =============================================
// NOTAS DE CLIENTE
// =============================================

/**
 * Obtener todas las notas activas de un cliente.
 */
export async function getNotasByInscripcion(inscripcion: number): Promise<NotaCliente[]> {
  return dbSelect<NotaCliente>(
    `SELECT * FROM notas_cliente
     WHERE inscripcion = $1
     ORDER BY fecha_creacion DESC`,
    [inscripcion]
  );
}

/**
 * Obtener solo las notas activas (activa = 1) de un cliente.
 * Útil para mostrar alertas en recepción al registrar asistencia.
 */
export async function getNotasActivasByInscripcion(inscripcion: number): Promise<NotaCliente[]> {
  return dbSelect<NotaCliente>(
    `SELECT * FROM notas_cliente
     WHERE inscripcion = $1 AND activa = 1
     ORDER BY fecha_creacion DESC`,
    [inscripcion]
  );
}

/**
 * Crear una nueva nota para un cliente.
 * tipo: 'info' | 'warning' | 'danger'
 *   - info    → observación general
 *   - warning → alerta que requiere atención
 *   - danger  → alerta crítica (lesión, restricción médica, etc.)
 */
export async function createNota(
  inscripcion: number,
  nota: string,
  tipo: 'info' | 'warning' | 'danger' = 'info'
): Promise<number> {
  const result = await dbExecute(
    `INSERT INTO notas_cliente (inscripcion, nota, tipo, activa)
     VALUES ($1, $2, $3, 1)`,
    [inscripcion, nota, tipo]
  );
  return result.lastInsertId;
}

/**
 * Editar el texto y/o tipo de una nota existente.
 */
export async function updateNota(
  id: number,
  nota: string,
  tipo: 'info' | 'warning' | 'danger'
): Promise<void> {
  await dbExecute(`UPDATE notas_cliente SET nota = $1, tipo = $2 WHERE id = $3`, [nota, tipo, id]);
}

/**
 * Desactivar una nota (ocultarla sin eliminarla).
 * Mantiene el historial pero deja de mostrarse como alerta activa.
 */
export async function desactivarNota(id: number): Promise<void> {
  await dbExecute(`UPDATE notas_cliente SET activa = 0 WHERE id = $1`, [id]);
}

/**
 * Reactivar una nota desactivada.
 */
export async function reactivarNota(id: number): Promise<void> {
  await dbExecute(`UPDATE notas_cliente SET activa = 1 WHERE id = $1`, [id]);
}

/**
 * Eliminar permanentemente una nota.
 */
export async function deleteNota(id: number): Promise<void> {
  await dbExecute(`DELETE FROM notas_cliente WHERE id = $1`, [id]);
}

/**
 * Verificar si un cliente tiene notas de alerta activas (warning o danger).
 * Útil en recepción para mostrar un indicador visual rápido.
 */
export async function clienteTieneAlertas(inscripcion: number): Promise<boolean> {
  const rows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM notas_cliente
     WHERE inscripcion = $1 AND activa = 1 AND tipo IN ('warning', 'danger')`,
    [inscripcion]
  );
  return (rows[0]?.c ?? 0) > 0;
}

/**
 * Contar notas activas de un cliente (para badge en UI).
 */
export async function countNotasActivas(inscripcion: number): Promise<number> {
  const rows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM notas_cliente WHERE inscripcion = $1 AND activa = 1`,
    [inscripcion]
  );
  return rows[0]?.c ?? 0;
}
