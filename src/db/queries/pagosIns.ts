import { dbSelect, dbSelectOne, dbTransaction } from "../useDb";
import type { PagoIns, QueryParams, PaginatedResult } from "../types";
import { today } from "@/lib/utils";

export async function getPagosInstructores(params: QueryParams = {}): Promise<PaginatedResult<PagoIns>> {
  const { page = 1, pageSize = 50, search = "", fechaDesde, fechaHasta } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(i.nombres LIKE $${args.length + 1} OR i.apellidos LIKE $${args.length + 2})`);
    args.push(`%${search}%`, `%${search}%`);
  }
  if (fechaDesde) { conditions.push(`p.fecha_pag >= $${args.length + 1}`); args.push(fechaDesde); }
  if (fechaHasta) { conditions.push(`p.fecha_pag <= $${args.length + 1}`); args.push(fechaHasta); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM pagos_ins p
     JOIN instructores i ON i.id = p.id_instructor ${where}`, args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<PagoIns>(`
    SELECT p.*,
      i.nombres || ' ' || i.apellidos as nombre_instructor,
      e.nombre as nombre_especialidad
    FROM pagos_ins p
    JOIN instructores i ON i.id = p.id_instructor
    LEFT JOIN especialidades e ON e.id = p.id_especialidad
    ${where}
    ORDER BY p.fecha_pag DESC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `, [...args, pageSize, offset]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function registrarPagoInstructor(params: {
  idInstructor: number;
  idEspecialidad: number | null;
  periodoIni: string;
  periodoFin: string;
  valor: number;
  observaciones: string;
  usuario: string;
}): Promise<number> {
  const fechaHoy = today();

  let lastId = 0;
  await dbTransaction([
    {
      sql: `INSERT INTO pagos_ins (id_instructor, id_especialidad, fecha_pag, periodo_ini, periodo_fin, valor, observaciones)
            VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      params: [
        params.idInstructor, params.idEspecialidad, fechaHoy,
        params.periodoIni, params.periodoFin, params.valor, params.observaciones,
      ],
    },
    {
      sql: `INSERT INTO mov_caja (referencia, fecha, natural, valor, val_egre, concepto, usuario)
            VALUES ($1,$2,'E',$3,$4,$5,$6)`,
      params: [
        `PI-${params.idInstructor}-${fechaHoy}`, fechaHoy,
        params.valor, params.valor,
        `Pago Instructor - ${params.periodoIni} a ${params.periodoFin}`,
        params.usuario,
      ],
    },
  ]);

  // Obtener el ID del pago recién insertado
  const idRow = await dbSelectOne<{ id: number }>(
    `SELECT id FROM pagos_ins WHERE id_instructor=$1 ORDER BY id DESC LIMIT 1`,
    [params.idInstructor]
  );
  lastId = idRow?.id ?? 0;
  return lastId;
}
