import { dbSelect, dbExecute, dbTransaction, getNextConsecutivo } from "../useDb";
import type { Cliente, Medida, PagoCli, QueryParams, PaginatedResult } from "../types";
import { today, addDays, toISODate } from "@/lib/utils";

// =============================================
// CLIENTES
// =============================================

export async function getClientes(params: QueryParams = {}): Promise<PaginatedResult<Cliente>> {
  const {
    page = 1,
    pageSize = 50,
    search = "",
    estado = "todos",
    orderBy = "nombres",
    orderDir = "ASC",
  } = params;

  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push("(cedula LIKE $" + (args.length + 1) + " OR nombres LIKE $" + (args.length + 2) + " OR apellidos LIKE $" + (args.length + 3) + ")");
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (estado !== "todos") {
    conditions.push(`estado = $${args.length + 1}`);
    args.push(estado);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const allowedOrder = ["nombres", "apellidos", "cedula", "inscripcion", "fecha_inscripcion"];
  const safeOrderBy = allowedOrder.includes(orderBy) ? orderBy : "nombres";
  const safeDir = orderDir === "DESC" ? "DESC" : "ASC";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM clientes ${where}`,
    args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<Cliente>(
    `SELECT * FROM clientes ${where} ORDER BY ${safeOrderBy} ${safeDir} LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset]
  );

  // Agregar nombre_completo
  const enriched = data.map((c) => ({
    ...c,
    nombre_completo: `${c.nombres} ${c.apellidos}`,
  }));

  return {
    data: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getClienteByCedula(cedula: string): Promise<Cliente | null> {
  const rows = await dbSelect<Cliente>(
    "SELECT * FROM clientes WHERE cedula = $1",
    [cedula]
  );
  return rows[0] ?? null;
}

export async function getClienteByInscripcion(inscripcion: number): Promise<Cliente | null> {
  const rows = await dbSelect<Cliente>(
    "SELECT * FROM clientes WHERE inscripcion = $1",
    [inscripcion]
  );
  return rows[0] ?? null;
}

/**
 * Busca cliente y calcula su próximo vencimiento dinámico.
 * vencimiento = FechaPago + factor_actividad del último pago mensual
 */
export async function getClienteConVencimiento(cedula: string): Promise<Cliente | null> {
  const cliente = await getClienteByCedula(cedula);
  if (!cliente) return null;

  const pagos = await dbSelect<{ fecha_pag: string; factor: number; nombre: string }>(`
    SELECT p.fecha_pag, a.factor, a.nombre
    FROM pagos_cli p
    JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1
      AND p.estado = 'A'
      AND p.periodicidad = 'M'
    ORDER BY p.fecha_pag DESC
    LIMIT 1
  `, [cliente.inscripcion]);

  let proximo_vencimiento: string | null = null;
  let actividad_vigente: string | null = null;

  if (pagos.length > 0) {
    const ultimo = pagos[0];
    const fechaVenc = addDays(ultimo.fecha_pag, ultimo.factor);
    proximo_vencimiento = toISODate(fechaVenc);
    actividad_vigente = ultimo.nombre;
  }

  return {
    ...cliente,
    nombre_completo: `${cliente.nombres} ${cliente.apellidos}`,
    proximo_vencimiento,
    actividad_vigente,
  };
}

export async function createCliente(
  data: Omit<Cliente, "id" | "fecha_creacion" | "nombre_completo" | "edad" | "proximo_vencimiento" | "actividad_vigente">
): Promise<number> {
  const result = await dbExecute(
    `INSERT INTO clientes (inscripcion, cedula, nombres, apellidos, direccion,
      telefono, celular, email, ciudad, sexo, fecha_inscripcion, fecha_nacimiento,
      estado, foto_path)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      data.inscripcion, data.cedula, data.nombres, data.apellidos,
      data.direccion, data.telefono, data.celular, data.email,
      data.ciudad, data.sexo, data.fecha_inscripcion, data.fecha_nacimiento,
      data.estado, data.foto_path,
    ]
  );
  return result.lastInsertId;
}

export async function updateCliente(
  cedula: string,
  data: Partial<Omit<Cliente, "id" | "cedula" | "inscripcion" | "fecha_creacion">>
): Promise<void> {
  const fields = Object.keys(data)
    .filter((k) => !["nombre_completo", "edad", "proximo_vencimiento", "actividad_vigente"].includes(k));
  if (fields.length === 0) return;

  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);

  await dbExecute(
    `UPDATE clientes SET ${sets} WHERE cedula = $${fields.length + 1}`,
    [...values, cedula]
  );
}

export async function deleteCliente(cedula: string): Promise<void> {
  await dbExecute("DELETE FROM clientes WHERE cedula = $1", [cedula]);
}

export async function inactivarCliente(cedula: string): Promise<void> {
  await dbExecute("UPDATE clientes SET estado = 'I' WHERE cedula = $1", [cedula]);
}

export async function activarCliente(cedula: string): Promise<void> {
  await dbExecute("UPDATE clientes SET estado = 'A' WHERE cedula = $1", [cedula]);
}

export async function countClientesActivos(): Promise<number> {
  const rows = await dbSelect<{ c: number }>(
    "SELECT COUNT(*) as c FROM clientes WHERE estado = 'A'"
  );
  return rows[0]?.c ?? 0;
}

export async function getNextInscripcion(): Promise<number> {
  return getNextConsecutivo("conse_ins");
}

// =============================================
// MEDIDAS
// =============================================

export async function getMedidasByInscripcion(inscripcion: number): Promise<Medida[]> {
  return dbSelect<Medida>(
    "SELECT * FROM medidas WHERE inscripcion = $1 ORDER BY fecha ASC",
    [inscripcion]
  );
}

export async function getUltimaMedida(inscripcion: number): Promise<Medida | null> {
  const rows = await dbSelect<Medida>(
    "SELECT * FROM medidas WHERE inscripcion = $1 ORDER BY fecha DESC LIMIT 1",
    [inscripcion]
  );
  return rows[0] ?? null;
}

export async function createMedida(data: Omit<Medida, "id">): Promise<number> {
  const result = await dbExecute(
    `INSERT INTO medidas (inscripcion, fecha, peso, talla, cintura, brazos,
      muslos, pantorrilla, torax, cadera, estatura)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      data.inscripcion, data.fecha, data.peso, data.talla, data.cintura,
      data.brazos, data.muslos, data.pantorrilla, data.torax, data.cadera, data.estatura,
    ]
  );
  return result.lastInsertId;
}

export async function updateMedida(id: number, data: Partial<Omit<Medida, "id" | "inscripcion">>): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE medidas SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function deleteMedida(id: number): Promise<void> {
  await dbExecute("DELETE FROM medidas WHERE id = $1", [id]);
}

// =============================================
// PAGOS_CLI (historial de pagos por actividad)
// =============================================

export async function getPagosByInscripcion(inscripcion: number): Promise<PagoCli[]> {
  return dbSelect<PagoCli>(`
    SELECT p.*, a.nombre as nombre_actividad, a.factor
    FROM pagos_cli p
    LEFT JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1
    ORDER BY p.fecha_pag DESC
  `, [inscripcion]);
}

// =============================================
// PROCESOS: Vencimientos, Cumpleaños, Inactivar
// =============================================

export async function getClientesVencimientos(diasAlerta: number) {
  const hoy = today();
  const limite = toISODate(addDays(new Date(), diasAlerta));

  return dbSelect<{
    inscripcion: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    celular: string | null;
    actividad: string;
    fecha_vencimiento: string;
    dias_restantes: number;
  }>(`
    SELECT
      cl.inscripcion,
      cl.cedula,
      cl.nombres,
      cl.apellidos,
      cl.celular,
      a.nombre as actividad,
      date(p.fecha_pag, '+' || a.factor || ' days') as fecha_vencimiento,
      CAST(julianday(date(p.fecha_pag, '+' || a.factor || ' days')) - julianday($1) AS INTEGER) as dias_restantes
    FROM pagos_cli p
    JOIN actividades a ON a.codigo = p.id_actividad
    JOIN clientes cl ON cl.inscripcion = p.inscripcion
    WHERE p.estado = 'A'
      AND p.periodicidad = 'M'
      AND cl.estado = 'A'
      AND p.id IN (
        SELECT id FROM pagos_cli p2
        WHERE p2.inscripcion = p.inscripcion AND p2.estado = 'A' AND p2.periodicidad = 'M'
        ORDER BY p2.fecha_pag DESC
        LIMIT 1
      )
      AND date(p.fecha_pag, '+' || a.factor || ' days') BETWEEN $1 AND $2
    ORDER BY fecha_vencimiento ASC
  `, [hoy, limite]);
}

export async function getClientesCumpleanos() {
  const hoy = today();
  const mes = hoy.substring(5, 7);
  const dia = hoy.substring(8, 10);

  return dbSelect<{
    inscripcion: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    celular: string | null;
    fecha_nacimiento: string;
    edad: number;
  }>(`
    SELECT
      inscripcion, cedula, nombres, apellidos, celular, fecha_nacimiento,
      CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', fecha_nacimiento) AS INTEGER) as edad
    FROM clientes
    WHERE estado = 'A'
      AND fecha_nacimiento IS NOT NULL
      AND strftime('%m-%d', fecha_nacimiento) = $1
    ORDER BY nombres ASC
  `, [`${mes}-${dia}`]);
}

export async function getClientesSinActividad(diasInactivar: number) {
  const limite = toISODate(addDays(new Date(), -diasInactivar));

  return dbSelect<{
    inscripcion: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    ultimo_pago: string | null;
    dias_sin_pago: number;
  }>(`
    SELECT
      cl.inscripcion,
      cl.cedula,
      cl.nombres,
      cl.apellidos,
      MAX(p.fecha_pag) as ultimo_pago,
      CAST(julianday('now') - julianday(COALESCE(MAX(p.fecha_pag), cl.fecha_creacion)) AS INTEGER) as dias_sin_pago
    FROM clientes cl
    LEFT JOIN pagos_cli p ON p.inscripcion = cl.inscripcion AND p.estado = 'A'
    WHERE cl.estado = 'A'
    GROUP BY cl.inscripcion
    HAVING COALESCE(MAX(p.fecha_pag), cl.fecha_creacion) <= $1
    ORDER BY dias_sin_pago DESC
  `, [limite]);
}

export async function inactivarClientesMasivo(cedulas: string[]): Promise<void> {
  if (cedulas.length === 0) return;
  const ops = cedulas.map((ced) => ({
    sql: "UPDATE clientes SET estado = 'I' WHERE cedula = $1",
    params: [ced],
  }));
  await dbTransaction(ops);
}
