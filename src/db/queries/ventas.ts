import { dbSelect, dbSelectOne, dbExecute, dbTransaction, getNextConsecutivo } from "../useDb";
import { decrementarStock, incrementarStock, createKardexSalida, createKardexEntrada } from "./inventario";
import type {
  Recibo, DetReciboPago, FactuTienda, DetFactuTienda,
  PagoCli, MovCaja, CtaPorCobrar, CuotaCli, QueryParams, PaginatedResult,
} from "../types";
import { today } from "@/lib/utils";

// =============================================
// VENTAS GYM — RECIBOS
// =============================================

export async function getRecibos(params: QueryParams = {}): Promise<PaginatedResult<Recibo>> {
  const { page = 1, pageSize = 50, search = "", fechaDesde, fechaHasta, estado = "todos" } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(r.cedula LIKE $${args.length + 1} OR c.nombres LIKE $${args.length + 2} OR c.apellidos LIKE $${args.length + 3})`);
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (estado !== "todos") {
    conditions.push(`r.estado = $${args.length + 1}`);
    args.push(estado);
  }
  if (fechaDesde) { conditions.push(`r.fecha >= $${args.length + 1}`); args.push(fechaDesde); }
  if (fechaHasta) { conditions.push(`r.fecha <= $${args.length + 1}`); args.push(fechaHasta); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM recibos r LEFT JOIN clientes c ON c.cedula = r.cedula ${where}`, args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<Recibo>(`
    SELECT r.*,
      c.nombres || ' ' || c.apellidos as nombre_cliente,
      (SELECT SUM(d.total) FROM det_recibo_pago d WHERE d.nro_docu = r.nro_docu) as total
    FROM recibos r
    LEFT JOIN clientes c ON c.cedula = r.cedula
    ${where}
    ORDER BY r.nro_docu DESC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `, [...args, pageSize, offset]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getReciboPorNro(nroDocu: number): Promise<Recibo | null> {
  const rows = await dbSelect<Recibo>(`
    SELECT r.*,
      c.nombres || ' ' || c.apellidos as nombre_cliente,
      (SELECT SUM(d.total) FROM det_recibo_pago d WHERE d.nro_docu = r.nro_docu) as total
    FROM recibos r
    LEFT JOIN clientes c ON c.cedula = r.cedula
    WHERE r.nro_docu = $1
  `, [nroDocu]);
  return rows[0] ?? null;
}

export async function getDetReciboPorNro(nroDocu: number): Promise<DetReciboPago[]> {
  return dbSelect<DetReciboPago>(
    "SELECT * FROM det_recibo_pago WHERE nro_docu = $1 ORDER BY id ASC",
    [nroDocu]
  );
}

/**
 * Guardar recibo Gym completo con todos sus efectos:
 * - Crear cabecera recibo
 * - Crear detalle items
 * - Crear pagos_cli por cada item
 * - Crear movimiento caja (ingreso)
 * - Incrementar consecutivo
 */
export async function guardarReciboGym(params: {
  cedula: string;
  inscripcion: number;
  fecha: string;
  hora: string;
  observaciones: string;
  valorLetras: string;
  items: Array<{
    codigo: string;
    detalle: string;
    cantidad: number;
    punitario: number;
    descuento: number;
    impuesto: number;
    total: number;
    periodicidad: "M" | "U";
  }>;
  totalGeneral: number;
  usuario: string;
}): Promise<number> {
  const nroDocu = await getNextConsecutivo("conse_rec");
  const fechaHoy = params.fecha || today();

  const ops = [
    // 1. Cabecera recibo
    {
      sql: `INSERT INTO recibos (nro_docu, fecha, hora, cedula, inscripcion, observaciones, valor_letras, estado)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'A')`,
      params: [nroDocu, fechaHoy, params.hora, params.cedula, params.inscripcion, params.observaciones, params.valorLetras],
    },
    // 2. Movimiento de caja (ingreso)
    {
      sql: `INSERT INTO mov_caja (referencia, fecha, cedula, concepto, natural, valor, val_ingre, usuario)
            VALUES ($1,$2,$3,$4,'I',$5,$6,$7)`,
      params: [
        String(nroDocu), fechaHoy, params.cedula,
        `Ingreso Segun Recibo No. ${nroDocu}`,
        params.totalGeneral, params.totalGeneral, params.usuario,
      ],
    },
  ];

  // 3. Items del detalle + pagos_cli
  for (const item of params.items) {
    ops.push({
      sql: `INSERT INTO det_recibo_pago (nro_docu, codigo, detalle, cantidad, punitario, descuento, impuesto, total, unmed)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SRV')`,
      params: [nroDocu, item.codigo, item.detalle, item.cantidad, item.punitario, item.descuento, item.impuesto, item.total],
    });
    ops.push({
      sql: `INSERT INTO pagos_cli (inscripcion, fecha_pag, id_actividad, valor, periodicidad, observaciones, estado, nro_recibo)
            VALUES ($1,$2,$3,$4,$5,$6,'A',$7)`,
      params: [
        params.inscripcion, fechaHoy, item.codigo,
        item.total, item.periodicidad,
        `Cobro S/R No. ${nroDocu}`, nroDocu,
      ],
    });
  }

  await dbTransaction(ops);
  return nroDocu;
}

/**
 * Anular recibo Gym:
 * - Marcar estado='X'
 * - Marcar pagos_cli como anulados
 * - Crear egreso en caja (reversa)
 */
export async function anularReciboGym(
  nroDocu: number,
  total: number,
  cedula: string,
  usuario: string
): Promise<void> {
  const fechaHoy = today();
  const hora = new Date().toLocaleTimeString("es-CO");

  const det = await getDetReciboPorNro(nroDocu);

  const ops: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: `UPDATE recibos SET estado='X', fecha_anulacion=$1, hora_anulacion=$2, usuario_anulacion=$3
            WHERE nro_docu=$4`,
      params: [fechaHoy, hora, usuario, nroDocu],
    },
    {
      sql: `INSERT INTO mov_caja (referencia, fecha, natural, cedula, valor, val_egre, concepto, usuario)
            VALUES ($1,$2,'E',$3,$4,$5,$6,$7)`,
      params: [
        String(nroDocu), fechaHoy, cedula, total, total,
        `Anulación Recibo No. ${nroDocu}`, usuario,
      ],
    },
  ];

  for (const item of det) {
    ops.push({
      sql: `UPDATE pagos_cli SET estado='X'
            WHERE inscripcion=(SELECT inscripcion FROM recibos WHERE nro_docu=$1)
              AND id_actividad=$2 AND nro_recibo=$3`,
      params: [nroDocu, item.codigo, nroDocu],
    });
  }

  await dbTransaction(ops);
}

// =============================================
// VENTAS TIENDA — FACTURAS
// =============================================

export async function getFacturasTienda(params: QueryParams = {}): Promise<PaginatedResult<FactuTienda>> {
  const { page = 1, pageSize = 50, search = "", fechaDesde, fechaHasta, estado = "todos" } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(f.cedula LIKE $${args.length + 1} OR c.nombres LIKE $${args.length + 2})`);
    args.push(`%${search}%`, `%${search}%`);
  }
  if (estado !== "todos") { conditions.push(`f.estado = $${args.length + 1}`); args.push(estado); }
  if (fechaDesde) { conditions.push(`f.fecha >= $${args.length + 1}`); args.push(fechaDesde); }
  if (fechaHasta) { conditions.push(`f.fecha <= $${args.length + 1}`); args.push(fechaHasta); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM factu_tienda f LEFT JOIN clientes c ON c.cedula = f.cedula ${where}`, args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<FactuTienda>(`
    SELECT f.*,
      c.nombres || ' ' || c.apellidos as nombre_cliente,
      fp.detalle as nombre_forma_pago
    FROM factu_tienda f
    LEFT JOIN clientes c ON c.cedula = f.cedula
    LEFT JOIN forma_pago fp ON fp.id = f.id_forma_pago
    ${where}
    ORDER BY f.nro_docu DESC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `, [...args, pageSize, offset]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getFacturaTiendaPorNro(nroDocu: number): Promise<FactuTienda | null> {
  const rows = await dbSelect<FactuTienda>(`
    SELECT f.*,
      c.nombres || ' ' || c.apellidos as nombre_cliente,
      fp.detalle as nombre_forma_pago
    FROM factu_tienda f
    LEFT JOIN clientes c ON c.cedula = f.cedula
    LEFT JOIN forma_pago fp ON fp.id = f.id_forma_pago
    WHERE f.nro_docu = $1
  `, [nroDocu]);
  return rows[0] ?? null;
}

export async function getDetFacturaTiendaPorNro(nroDocu: number): Promise<DetFactuTienda[]> {
  return dbSelect<DetFactuTienda>(
    "SELECT * FROM det_factu_tienda WHERE nro_docu = $1 ORDER BY id ASC",
    [nroDocu]
  );
}

/**
 * Guardar factura tienda con todos sus efectos:
 * - Cabecera factura
 * - Detalle items
 * - Decrementar stock + kardex salida
 * - Caja (si contado) o CxC + cuotas (si crédito)
 */
export async function guardarFacturaTienda(params: {
  cedula: string;
  fecha: string;
  hora: string;
  idFormaPago: number;
  plazo: number;
  subtotal: number;
  iva: number;
  total: number;
  valorLetras: string;
  items: Array<{
    codigo: string;
    detalle: string;
    cantidad: number;
    punitario: number;
    descuento: number;
    impuesto: number;
    total: number;
  }>;
  abonoInicial: number;
  usuario: string;
}): Promise<number> {
  const nroDocu = await getNextConsecutivo("conse_fac");
  const fechaHoy = params.fecha || today();

  // Fase 1: cabecera + detalle
  const ops: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: `INSERT INTO factu_tienda (nro_docu, fecha, hora, cedula, id_forma_pago, plazo,
              subtotal, iva, total, valor_letras, estado)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'A')`,
      params: [
        nroDocu, fechaHoy, params.hora, params.cedula, params.idFormaPago,
        params.plazo, params.subtotal, params.iva, params.total, params.valorLetras,
      ],
    },
  ];

  for (const item of params.items) {
    ops.push({
      sql: `INSERT INTO det_factu_tienda (nro_docu, codigo, detalle, cantidad, punitario,
              descuento, impuesto, total, unmed)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'UND')`,
      params: [nroDocu, item.codigo, item.detalle, item.cantidad, item.punitario,
               item.descuento, item.impuesto, item.total],
    });
  }

  // Fase 2: caja o crédito
  if (params.plazo === 0) {
    // Contado
    ops.push({
      sql: `INSERT INTO mov_caja (referencia, fecha, natural, cedula, valor, val_ingre, concepto, usuario)
            VALUES ($1,$2,'I',$3,$4,$5,$6,$7)`,
      params: [
        String(nroDocu), fechaHoy, params.cedula, params.total, params.total,
        `Venta Segun Factura No. ${nroDocu}`, params.usuario,
      ],
    });
  } else {
    // Crédito: CxC + cuotas
    const saldoTrasAbono = params.total - params.abonoInicial;
    const nroMeses = Math.max(1, Math.floor(params.plazo / 30));
    const valorCuota = saldoTrasAbono / nroMeses;
    const fechaVen = new Date(fechaHoy);
    fechaVen.setDate(fechaVen.getDate() + params.plazo);

    // Número de movimiento CxC
    const lastMovRow1 = await dbSelectOne<{ max_mov: number | null }>(
      "SELECT MAX(num_mov) as max_mov FROM ctas_por_cobrar WHERE id_cliente = $1",
      [params.cedula]
    );
    const nextMov = (lastMovRow1?.max_mov ?? 0) + 1;

    ops.push({
      sql: `INSERT INTO ctas_por_cobrar (num_mov, id_cliente, num_docu, id_tipomo, fecha_doc,
              fecha_ven, concemo, importe, pago_clien, diferencia, saldo_clien)
            VALUES ($1,$2,$3,'FA',$4,$5,$6,$7,$8,$9,$10)`,
      params: [
        nextMov, params.cedula, String(nroDocu), fechaHoy,
        fechaVen.toISOString().split("T")[0],
        `Venta S/Factura No. ${nroDocu}`,
        params.total, params.abonoInicial,
        params.total - params.abonoInicial,
        params.total - params.abonoInicial,
      ],
    });

    if (params.abonoInicial > 0) {
      ops.push({
        sql: `INSERT INTO mov_caja (referencia, fecha, natural, cedula, valor, val_ingre, concepto, usuario)
              VALUES ($1,$2,'I',$3,$4,$5,$6,$7)`,
        params: [
          String(nroDocu), fechaHoy, params.cedula,
          params.abonoInicial, params.abonoInicial,
          `Cuota Inicial a Factura No. ${nroDocu}`, params.usuario,
        ],
      });
    }

    // Generar cuotas mensuales
    for (let i = 1; i <= nroMeses; i++) {
      const fechaCuota = new Date(fechaHoy);
      fechaCuota.setDate(fechaCuota.getDate() + 30 * i);
      ops.push({
        sql: `INSERT INTO cuotas_cli (id_cliente, num_doc, nro_cuota, id_tipomo, vencim,
                importe_total, tmp_importe, estado)
              VALUES ($1,$2,$3,'FA',$4,$5,$6,'P')`,
        params: [
          params.cedula, String(nroDocu), i,
          fechaCuota.toISOString().split("T")[0],
          valorCuota, valorCuota,
        ],
      });
    }
  }

  await dbTransaction(ops);

  // Fase 3: kardex + stock (fuera de la transacción por compatibilidad del plugin)
  for (const item of params.items) {
    await createKardexSalida(
      item.codigo, fechaHoy,
      `Venta S/F No. ${nroDocu}`,
      item.cantidad, item.punitario / item.cantidad
    );
    await decrementarStock(item.codigo, item.cantidad);
  }

  return nroDocu;
}

/**
 * Anular factura tienda con reversa completa:
 * - Marcar estado='X'
 * - Revertir stock + kardex entrada
 * - CxC tipo AN
 * - Egreso en caja
 */
export async function anularFacturaTienda(
  nroDocu: number,
  total: number,
  cedula: string,
  usuario: string
): Promise<void> {
  const fechaHoy = today();
  const hora = new Date().toLocaleTimeString("es-CO");
  const det = await getDetFacturaTiendaPorNro(nroDocu);
  const factura = await getFacturaTiendaPorNro(nroDocu);
  if (!factura) throw new Error(`Factura ${nroDocu} no encontrada`);

  const ops: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: `UPDATE factu_tienda SET estado='X', fecha_anulacion=$1, hora_anulacion=$2, usuario_anulacion=$3
            WHERE nro_docu=$4`,
      params: [fechaHoy, hora, usuario, nroDocu],
    },
  ];

  if (factura.plazo === 0) {
    // Contado: egreso en caja
    ops.push({
      sql: `INSERT INTO mov_caja (referencia, fecha, natural, cedula, valor, val_egre, concepto, usuario)
            VALUES ($1,$2,'E',$3,$4,$5,$6,$7)`,
      params: [
        String(nroDocu), fechaHoy, cedula, total, total,
        `Anulación factura No. ${nroDocu}`, usuario,
      ],
    });
  } else {
    // Crédito: CxC tipo AN
    const lastMovRowAnul = await dbSelectOne<{ max_mov: number | null }>(
      "SELECT MAX(num_mov) as max_mov FROM ctas_por_cobrar WHERE id_cliente = $1",
      [cedula]
    );
    const nextMov = (lastMovRowAnul?.max_mov ?? 0) + 1;
    const lastSaldoRowAnul = await dbSelectOne<{ saldo: number | null }>(
      "SELECT saldo_clien as saldo FROM ctas_por_cobrar WHERE id_cliente=$1 ORDER BY num_mov DESC LIMIT 1",
      [cedula]
    );
    const saldoActual = lastSaldoRowAnul?.saldo ?? 0;

    ops.push({
      sql: `INSERT INTO ctas_por_cobrar (num_mov, id_cliente, num_docu, id_tipomo, fecha_doc, concemo,
              importe, pago_clien, diferencia, saldo_clien)
            VALUES ($1,$2,$3,'AN',$4,$5,0,$6,$7,$8)`,
      params: [
        nextMov, cedula, String(nroDocu), fechaHoy,
        `Anulación Venta S/Factura No. ${nroDocu}`,
        total, -total, saldoActual - total,
      ],
    });
  }

  await dbTransaction(ops);

  // Revertir stock y kardex
  for (const item of det) {
    await createKardexEntrada(
      item.codigo, fechaHoy,
      `Anulación Venta S/F No. ${nroDocu}`,
      item.cantidad, item.punitario / item.cantidad
    );
    await incrementarStock(item.codigo, item.cantidad);
  }
}

// =============================================
// PAGOS_CLI — Consulta consolidada
// =============================================

export async function getConsultaPagosPorCliente(cedula: string): Promise<PagoCli[]> {
  const rows = await dbSelect<{ inscripcion: number }>( 
    "SELECT inscripcion FROM clientes WHERE cedula = $1", [cedula]
  );
  if (rows.length === 0) return [];

  return dbSelect<PagoCli>(`
    SELECT p.*, a.nombre as nombre_actividad, a.factor
    FROM pagos_cli p
    LEFT JOIN actividades a ON a.codigo = p.id_actividad
    WHERE p.inscripcion = $1
    ORDER BY p.fecha_pag DESC
  `, [rows[0].inscripcion]);
}
