import { dbSelect, dbSelectOne, dbTransaction, dbExecute } from '../useDb';
import type { PagoIns, QueryParams, PaginatedResult } from '../types';
import { today } from '@/lib/utils';

export async function getPagosInstructores(
  params: QueryParams = {}
): Promise<PaginatedResult<PagoIns>> {
  const { page = 1, pageSize = 50, search = '', fechaDesde, fechaHasta } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(i.nombres LIKE $${args.length + 1} OR i.apellidos LIKE $${args.length + 2})`);
    args.push(`%${search}%`, `%${search}%`);
  }
  if (fechaDesde) {
    conditions.push(`p.fecha_pag >= $${args.length + 1}`);
    args.push(fechaDesde);
  }
  if (fechaHasta) {
    conditions.push(`p.fecha_pag <= $${args.length + 1}`);
    args.push(fechaHasta);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM pagos_ins p
     JOIN instructores i ON i.id = p.id_instructor ${where}`,
    args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<PagoIns>(
    `
    SELECT p.*,
      i.nombres || ' ' || i.apellidos as nombre_instructor,
      e.nombre as nombre_especialidad
    FROM pagos_ins p
    JOIN instructores i ON i.id = p.id_instructor
    LEFT JOIN especialidades e ON e.id = p.id_especialidad
    ${where}
    ORDER BY p.fecha_pag DESC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `,
    [...args, pageSize, offset]
  );

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
  const insResult = await dbSelect<{ nombres: string; apellidos: string; cedula: string }>(
    `SELECT nombres, apellidos, cedula FROM instructores WHERE id = $1`,
    [params.idInstructor]
  );
  const nombreIns =
    insResult.length > 0
      ? `${insResult[0].nombres} ${insResult[0].apellidos}`
      : `Instructor #${params.idInstructor}`;
  const cedulaIns = insResult.length > 0 ? insResult[0].cedula : null;

  // Primero insertar el pago
  await dbExecute(
    `INSERT INTO pagos_ins (id_instructor, id_especialidad, fecha_pag, periodo_ini, periodo_fin, valor, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      params.idInstructor,
      params.idEspecialidad,
      fechaHoy,
      params.periodoIni,
      params.periodoFin,
      params.valor,
      params.observaciones,
    ]
  );

  // Obtener el ID del pago recién insertado
  const idRow = await dbSelectOne<{ id: number }>(
    `SELECT id FROM pagos_ins WHERE id_instructor=$1 ORDER BY id DESC LIMIT 1`,
    [params.idInstructor]
  );
  const pagoId = idRow?.id ?? 0;

  // Insertar el movimiento de caja con el ID del pago como referencia
  await dbExecute(
    `INSERT INTO mov_caja (referencia, fecha, cedula, natural, valor, val_egre, concepto, usuario)
     VALUES ($1,$2,$3,'E',$4,$5,$6,$7)`,
    [
      String(pagoId),
      fechaHoy,
      cedulaIns,
      params.valor,
      params.valor,
      `Pago a Instructor ${nombreIns} - ${params.periodoIni} a ${params.periodoFin}`,
      params.usuario,
    ]
  );

  return pagoId;
}
