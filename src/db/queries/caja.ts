import { dbSelect, dbSelectOne, dbExecute, dbTransaction } from "../useDb";
import type { MovCaja, ResumenCaja, QueryParams, PaginatedResult } from "../types";
import { today } from "@/lib/utils";

// =============================================
// MOVIMIENTOS DE CAJA
// =============================================

export async function getMovimientosCaja(params: QueryParams = {}): Promise<PaginatedResult<MovCaja>> {
  const { page = 1, pageSize = 100, fechaDesde, fechaHasta, search = "" } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (fechaDesde) { conditions.push(`fecha >= $${args.length + 1}`); args.push(fechaDesde); }
  if (fechaHasta) { conditions.push(`fecha <= $${args.length + 1}`); args.push(fechaHasta); }
  if (search) {
    conditions.push(`(concepto LIKE $${args.length + 1} OR referencia LIKE $${args.length + 2} OR cedula LIKE $${args.length + 3})`);
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c 
     FROM mov_caja m 
     LEFT JOIN clientes c ON m.cedula = c.cedula
     LEFT JOIN instructores i ON m.cedula = i.cedula
     LEFT JOIN proveedores p ON m.cedula = p.nit
     ${where.replace(/fecha/g, 'm.fecha').replace(/concepto/g, 'm.concepto').replace(/referencia/g, 'm.referencia').replace(/cedula/g, 'm.cedula')}`, args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<MovCaja>(
    `SELECT m.*, 
       COALESCE(c.nombres || ' ' || c.apellidos, i.nombres || ' ' || i.apellidos, p.nombre) as nombre_cliente 
     FROM mov_caja m
     LEFT JOIN clientes c ON m.cedula = c.cedula
     LEFT JOIN instructores i ON m.cedula = i.cedula
     LEFT JOIN proveedores p ON m.cedula = p.nit
     ${where.replace(/fecha/g, 'm.fecha').replace(/concepto/g, 'm.concepto').replace(/referencia/g, 'm.referencia').replace(/cedula/g, 'm.cedula')} 
     ORDER BY m.fecha DESC, m.id DESC
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, pageSize, offset]
  );

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getResumenCaja(fechaDesde?: string, fechaHasta?: string): Promise<ResumenCaja> {
  const hoy = today();
  const desde = fechaDesde ?? hoy;
  const hasta = fechaHasta ?? hoy;

  const rows = await dbSelect<{
    total_ingresos: number;
    total_egresos: number;
  }>(`
    SELECT
      COALESCE(SUM(CASE WHEN natural='I' THEN valor ELSE 0 END), 0) as total_ingresos,
      COALESCE(SUM(CASE WHEN natural='E' THEN valor ELSE 0 END), 0) as total_egresos
    FROM mov_caja
    WHERE fecha BETWEEN $1 AND $2
  `, [desde, hasta]);

  const { total_ingresos, total_egresos } = rows[0] ?? { total_ingresos: 0, total_egresos: 0 };
  return {
    total_ingresos,
    total_egresos,
    saldo: total_ingresos - total_egresos,
  };
}

export async function registrarMovimientoManual(params: {
  concepto: string;
  natural: "I" | "E";
  valor: number;
  referencia?: string;
  cedula?: string;
  usuario: string;
}): Promise<void> {
  const fechaHoy = today();
  await dbExecute(
    `INSERT INTO mov_caja (referencia, fecha, cedula, concepto, natural, valor, val_ingre, val_egre, usuario)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      params.referencia ?? "",
      fechaHoy,
      params.cedula ?? "",
      params.concepto,
      params.natural,
      params.valor,
      params.natural === "I" ? params.valor : 0,
      params.natural === "E" ? params.valor : 0,
      params.usuario,
    ]
  );
}

// =============================================
// CUENTAS POR COBRAR
// =============================================

export async function getCtasPorCobrar(cedula: string) {
  return dbSelect<{
    id: number;
    num_mov: number;
    num_docu: string | null;
    id_tipomo: string;
    fecha_doc: string;
    concemo: string | null;
    importe: number;
    pago_clien: number;
    diferencia: number;
    saldo_clien: number;
  }>(
    `SELECT * FROM ctas_por_cobrar WHERE id_cliente = $1 ORDER BY num_mov ASC`,
    [cedula]
  );
}

export async function getSaldoCliente(cedula: string): Promise<number> {
  const row = await dbSelectOne<{ saldo: number | null }>(
    `SELECT saldo_clien as saldo FROM ctas_por_cobrar
     WHERE id_cliente = $1 ORDER BY num_mov DESC LIMIT 1`,
    [cedula]
  );
  return row?.saldo ?? 0;
}

export async function registrarMovCtaCobrar(params: {
  cedula: string;
  idTipomo: "AB" | "NC" | "ND";
  concepto: string;
  importe: number;
  usuario: string;
}): Promise<void> {
  const fechaHoy = today();
  const lastMovRow = await dbSelectOne<{ max_mov: number | null; saldo: number | null }>(
    `SELECT MAX(num_mov) as max_mov, saldo_clien as saldo
     FROM ctas_por_cobrar WHERE id_cliente = $1`,
    [params.cedula]
  );
  const nextMov = (lastMovRow?.max_mov ?? 0) + 1;
  const saldoActual = lastMovRow?.saldo ?? 0;

  let nuevoImporte = 0;
  let nuevoPago = 0;
  let diferencia = 0;
  let nuevoSaldo = saldoActual;
  let naturalCaja: "I" | "E" | null = null;

  switch (params.idTipomo) {
    case "AB":
      nuevoPago = params.importe;
      diferencia = -params.importe;
      nuevoSaldo = saldoActual - params.importe;
      naturalCaja = "I";
      break;
    case "NC":
      nuevoPago = params.importe;
      diferencia = -params.importe;
      nuevoSaldo = saldoActual - params.importe;
      naturalCaja = "I";
      break;
    case "ND":
      nuevoImporte = params.importe;
      diferencia = params.importe;
      nuevoSaldo = saldoActual + params.importe;
      naturalCaja = "E";
      break;
  }

  const movNro = `MOV-${Date.now()}`;

  const ops = [
    {
      sql: `INSERT INTO ctas_por_cobrar (num_mov, id_cliente, num_docu, id_tipomo, fecha_doc,
              concemo, importe, pago_clien, diferencia, saldo_clien)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      params: [
        nextMov, params.cedula, movNro, params.idTipomo, fechaHoy,
        params.concepto, nuevoImporte, nuevoPago, diferencia, nuevoSaldo,
      ],
    },
  ];

  if (naturalCaja) {
    ops.push({
      sql: `INSERT INTO mov_caja (referencia, fecha, cedula, natural, valor, val_ingre, val_egre, concepto, usuario)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      params: [
        movNro, fechaHoy, params.cedula, naturalCaja,
        params.importe,
        naturalCaja === "I" ? params.importe : 0,
        naturalCaja === "E" ? params.importe : 0,
        params.concepto, params.usuario,
      ],
    });
  }

  await dbTransaction(ops);
}

// =============================================
// CUOTAS DE CLIENTES
// =============================================

export async function getCuotasByCliente(cedula: string) {
  return dbSelect<{
    id: number;
    num_doc: string | null;
    nro_cuota: number;
    vencim: string | null;
    importe_total: number;
    pagado: number;
    estado: string;
  }>(
    `SELECT * FROM cuotas_cli WHERE id_cliente = $1 ORDER BY nro_cuota ASC`,
    [cedula]
  );
}

export async function pagarCuota(
  idCuota: number,
  valorPago: number,
  usuario: string
): Promise<void> {
  const fechaHoy = today();
  const cuotaRow = await dbSelectOne<{ id_cliente: string; importe_total: number; pagado: number }>(
    "SELECT id_cliente, importe_total, pagado FROM cuotas_cli WHERE id = $1",
    [idCuota]
  );
  if (!cuotaRow) throw new Error("Cuota no encontrada");
  const { id_cliente, importe_total, pagado } = cuotaRow;
  const nuevoPagado = pagado + valorPago;
  const nuevoEstado = nuevoPagado >= importe_total ? "C" : "P";

  await dbTransaction([
    {
      sql: `UPDATE cuotas_cli SET pagado = $1, estado = $2 WHERE id = $3`,
      params: [nuevoPagado, nuevoEstado, idCuota],
    },
    {
      sql: `INSERT INTO abono_cuota (id_cuota, fecha, valor, concepto)
            VALUES ($1,$2,$3,$4)`,
      params: [idCuota, fechaHoy, valorPago, `Abono cuota ${idCuota}`],
    },
    {
      sql: `INSERT INTO mov_caja (fecha, cedula, natural, valor, val_ingre, concepto, usuario)
            VALUES ($1,$2,'I',$3,$4,$5,$6)`,
      params: [
        fechaHoy, id_cliente, valorPago, valorPago,
        `Abono cuota No. ${idCuota}`, usuario,
      ],
    },
  ]);
}
