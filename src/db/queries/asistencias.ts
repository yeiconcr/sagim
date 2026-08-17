/**
 * Queries para el módulo de asistencias
 */
import { getDb } from "../database";

export interface Asistencia {
  id: number;
  inscripcion: number;
  fecha: string;
  hora: string;
  tipo: string;
  // Datos del cliente (JOIN)
  cedula?: string;
  nombre_completo?: string;
}

export interface AsistenciaResumen {
  fecha: string;
  total_entradas: number;
  clientes_unicos: number;
}

export interface GetAsistenciasParams {
  fechaDesde?: string;
  fechaHasta?: string;
  inscripcion?: number;
  pageSize?: number;
  page?: number;
}

/**
 * Obtener asistencias con filtros
 */
export async function getAsistencias(params: GetAsistenciasParams = {}) {
  const db = await getDb();
  const { fechaDesde, fechaHasta, inscripcion, pageSize = 100, page = 1 } = params;

  let where = "1=1";
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (fechaDesde) {
    where += ` AND a.fecha >= $${paramIndex++}`;
    queryParams.push(fechaDesde);
  }
  if (fechaHasta) {
    where += ` AND a.fecha <= $${paramIndex++}`;
    queryParams.push(fechaHasta);
  }
  if (inscripcion) {
    where += ` AND a.inscripcion = $${paramIndex++}`;
    queryParams.push(inscripcion);
  }

  const offset = (page - 1) * pageSize;

  const data = await db.select<Asistencia[]>(`
    SELECT a.id, a.inscripcion, a.fecha, a.hora, a.tipo,
           c.cedula, (c.nombres || ' ' || c.apellidos) as nombre_completo
    FROM asistencias a
    LEFT JOIN clientes c ON c.inscripcion = a.inscripcion
    WHERE ${where}
    ORDER BY a.fecha DESC, a.hora DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `, queryParams);

  const countResult = await db.select<[{ total: number }]>(`
    SELECT COUNT(*) as total FROM asistencias a WHERE ${where}
  `, queryParams);

  return {
    data,
    total: countResult[0]?.total || 0,
    page,
    pageSize,
  };
}

/**
 * Obtener resumen de asistencias por día
 */
export async function getAsistenciasResumen(params: { fechaDesde?: string; fechaHasta?: string } = {}) {
  const db = await getDb();
  const { fechaDesde, fechaHasta } = params;

  let where = "1=1";
  const queryParams: string[] = [];
  let paramIndex = 1;

  if (fechaDesde) {
    where += ` AND fecha >= $${paramIndex++}`;
    queryParams.push(fechaDesde);
  }
  if (fechaHasta) {
    where += ` AND fecha <= $${paramIndex++}`;
    queryParams.push(fechaHasta);
  }

  const data = await db.select<AsistenciaResumen[]>(`
    SELECT fecha, 
           COUNT(*) as total_entradas,
           COUNT(DISTINCT inscripcion) as clientes_unicos
    FROM asistencias
    WHERE ${where}
    GROUP BY fecha
    ORDER BY fecha DESC
  `, queryParams);

  return data;
}

/**
 * Obtener estadísticas de asistencias
 */
export async function getAsistenciasEstadisticas(params: { fechaDesde?: string; fechaHasta?: string } = {}) {
  const db = await getDb();
  const { fechaDesde, fechaHasta } = params;

  let where = "1=1";
  const queryParams: string[] = [];
  let paramIndex = 1;

  if (fechaDesde) {
    where += ` AND fecha >= $${paramIndex++}`;
    queryParams.push(fechaDesde);
  }
  if (fechaHasta) {
    where += ` AND fecha <= $${paramIndex++}`;
    queryParams.push(fechaHasta);
  }

  // Total de entradas
  const totalResult = await db.select<[{ total: number }]>(`
    SELECT COUNT(*) as total FROM asistencias WHERE ${where}
  `, queryParams);

  // Clientes únicos
  const unicosResult = await db.select<[{ total: number }]>(`
    SELECT COUNT(DISTINCT inscripcion) as total FROM asistencias WHERE ${where}
  `, queryParams);

  // Hora pico (hora con más entradas)
  const horaPicoResult = await db.select<[{ hora: string; total: number }]>(`
    SELECT substr(hora, 1, 2) as hora, COUNT(*) as total 
    FROM asistencias WHERE ${where}
    GROUP BY substr(hora, 1, 2)
    ORDER BY total DESC
    LIMIT 1
  `, queryParams);

  // Días con asistencia
  const diasResult = await db.select<[{ total: number }]>(`
    SELECT COUNT(DISTINCT fecha) as total FROM asistencias WHERE ${where}
  `, queryParams);

  const totalEntradas = totalResult[0]?.total || 0;
  const diasConAsistencia = diasResult[0]?.total || 1;

  return {
    totalEntradas,
    clientesUnicos: unicosResult[0]?.total || 0,
    horaPico: horaPicoResult[0]?.hora ? `${horaPicoResult[0].hora}:00` : null,
    promedioDiario: Math.round(totalEntradas / diasConAsistencia),
  };
}

/**
 * Obtener historial de asistencias de un cliente específico
 */
export async function getAsistenciasCliente(inscripcion: number, limite: number = 20) {
  const db = await getDb();

  const data = await db.select<Asistencia[]>(`
    SELECT id, inscripcion, fecha, hora, tipo
    FROM asistencias
    WHERE inscripcion = $1
    ORDER BY fecha DESC, hora DESC
    LIMIT $2
  `, [inscripcion, limite]);

  // Estadísticas del cliente
  const hoyStr = new Date().toISOString().split('T')[0];
  const inicioMes = hoyStr.substring(0, 7) + "-01";
  
  const estatsMes = await db.select<[{ total: number }]>(`
    SELECT COUNT(*) as total FROM asistencias WHERE inscripcion = $1 AND fecha >= $2
  `, [inscripcion, inicioMes]);

  const estatsTotal = await db.select<[{ total: number }]>(`
    SELECT COUNT(*) as total FROM asistencias WHERE inscripcion = $1
  `, [inscripcion]);

  return {
    historial: data,
    visitasMes: estatsMes[0]?.total || 0,
    visitasTotal: estatsTotal[0]?.total || 0,
  };
}
