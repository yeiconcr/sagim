import { dbSelect, dbSelectOne, dbExecute, dbTransaction } from "../useDb";
import { createKardexEntrada, incrementarStock } from "./inventario";
import type { Compra, DetCompra, CtaPorPagar, QueryParams, PaginatedResult } from "../types";
import { today } from "@/lib/utils";

// =============================================
// COMPRAS
// =============================================

export async function getCompras(params: QueryParams = {}): Promise<PaginatedResult<Compra>> {
  const { page = 1, pageSize = 50, search = "", fechaDesde, fechaHasta } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(p.nombre LIKE $${args.length + 1} OR c.nro_documento LIKE $${args.length + 2})`);
    args.push(`%${search}%`, `%${search}%`);
  }
  if (fechaDesde) { conditions.push(`c.fecha >= $${args.length + 1}`); args.push(fechaDesde); }
  if (fechaHasta) { conditions.push(`c.fecha <= $${args.length + 1}`); args.push(fechaHasta); }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM compras c LEFT JOIN proveedores p ON p.id = c.id_proveedor ${where}`, args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<Compra>(`
    SELECT c.*, p.nombre as nombre_proveedor, fp.detalle as nombre_forma_pago
    FROM compras c
    LEFT JOIN proveedores p ON p.id = c.id_proveedor
    LEFT JOIN forma_pago fp ON fp.id = c.id_forma_pago
    ${where}
    ORDER BY c.nro_compra DESC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `, [...args, pageSize, offset]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCompraPorNro(nroCompra: number): Promise<Compra | null> {
  const rows = await dbSelect<Compra>(`
    SELECT c.*, p.nombre as nombre_proveedor, fp.detalle as nombre_forma_pago
    FROM compras c
    LEFT JOIN proveedores p ON p.id = c.id_proveedor
    LEFT JOIN forma_pago fp ON fp.id = c.id_forma_pago
    WHERE c.nro_compra = $1
  `, [nroCompra]);
  return rows[0] ?? null;
}

export async function getDetCompraPorNro(nroCompra: number): Promise<DetCompra[]> {
  return dbSelect<DetCompra>(
    "SELECT * FROM det_compra WHERE nro_compra = $1 ORDER BY id ASC",
    [nroCompra]
  );
}

export async function getNextNroCompra(): Promise<number> {
  const maxRow = await dbSelectOne<{ max: number | null }>("SELECT MAX(nro_compra) as max FROM compras");
  return (maxRow?.max ?? 0) + 1;
}

/**
 * Guardar compra completa con todos sus efectos:
 * - Cabecera compra
 * - Detalle items
 * - Kardex entrada + incrementar stock
 * - Caja (si contado) o CxP (si crédito)
 */
export async function guardarCompra(params: {
  idProveedor: number;
  fecha: string;
  nroDocumento: string;
  idFormaPago: number;
  plazo: number;
  items: Array<{
    codigo: string;
    detalle: string;
    cantidad: number;
    punitario: number;
    total: number;
  }>;
  total: number;
  observaciones: string;
  usuario: string;
}): Promise<number> {
  const nroCompra = await getNextNroCompra();
  const fechaHoy = params.fecha || today();

  const ops: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: `INSERT INTO compras (nro_compra, fecha, id_proveedor, nro_documento, total,
              id_forma_pago, plazo, observaciones, estado)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'A')`,
      params: [
        nroCompra, fechaHoy, params.idProveedor, params.nroDocumento,
        params.total, params.idFormaPago, params.plazo, params.observaciones,
      ],
    },
  ];

  for (const item of params.items) {
    ops.push({
      sql: `INSERT INTO det_compra (nro_compra, codigo, detalle, cantidad, punitario, total)
            VALUES ($1,$2,$3,$4,$5,$6)`,
      params: [nroCompra, item.codigo, item.detalle, item.cantidad, item.punitario, item.total],
    });
  }

  if (params.plazo === 0) {
    // Contado: egreso en caja
    // Obtener nombre del proveedor para el concepto
    const provResult = await dbSelect<{ nombre: string, nit: string }>(
      "SELECT nombre, nit FROM proveedores WHERE id = $1",
      [params.idProveedor]
    );
    const nombreProv = provResult.length > 0 ? provResult[0].nombre : `Proveedor #${params.idProveedor}`;
    const nitProv = provResult.length > 0 ? provResult[0].nit : null;
    
    // Armar el concepto con el primer ítem
    const primerItem = params.items.length > 0 ? params.items[0].detalle : "";
    const extraInfo = params.items.length > 1 ? " y otros" : "";
    const concepto = `Compra a ${nombreProv} - ${primerItem}${extraInfo}`;

    ops.push({
      sql: `INSERT INTO mov_caja (referencia, fecha, cedula, natural, concepto, valor, val_egre, usuario)
            VALUES ($1,$2,$3,'E',$4,$5,$6,$7)`,
      params: [
        String(nroCompra), fechaHoy, nitProv,
        concepto,
        params.total, params.total, params.usuario,
      ],
    });
  } else {
    // Crédito: CxP
    const fechaVen = new Date(fechaHoy);
    fechaVen.setDate(fechaVen.getDate() + params.plazo);
    ops.push({
      sql: `INSERT INTO ctas_por_pagar (nro_compra, id_proveedor, fecha_doc, fecha_ven,
              importe, pagado, saldo, estado)
            VALUES ($1,$2,$3,$4,$5,0,$6,'P')`,
      params: [
        nroCompra, params.idProveedor, fechaHoy,
        fechaVen.toISOString().split("T")[0],
        params.total, params.total,
      ],
    });
  }

  await dbTransaction(ops);

  // Kardex + stock fuera de transacción
  for (const item of params.items) {
    if (item.codigo && item.codigo !== "GASTO") {
      await createKardexEntrada(
        item.codigo, fechaHoy,
        `Compra No. ${nroCompra}`,
        item.cantidad, item.punitario
      );
      await incrementarStock(item.codigo, item.cantidad);
      // Actualizar el costo de compra en el inventario al nuevo precio adquirido
      await dbExecute("UPDATE inventario SET precio_compra = $1 WHERE codigo = $2", [item.punitario, item.codigo]);
    }
  }

  return nroCompra;
}

// =============================================
// CUENTAS POR PAGAR
// =============================================

export async function getCtasPorPagar(soloPendientes = true): Promise<CtaPorPagar[]> {
  const where = soloPendientes ? "WHERE cp.estado = 'P'" : "";
  return dbSelect<CtaPorPagar>(`
    SELECT cp.*, p.nombre as nombre_proveedor
    FROM ctas_por_pagar cp
    LEFT JOIN proveedores p ON p.id = cp.id_proveedor
    ${where}
    ORDER BY cp.fecha_ven ASC
  `);
}

export async function abonarCtaPorPagar(id: number, valorAbono: number, usuario: string): Promise<void> {
  const cpRow = await dbSelectOne<{ saldo: number; id_proveedor: number }>(
    "SELECT saldo, id_proveedor FROM ctas_por_pagar WHERE id = $1", [id]
  );
  if (!cpRow) throw new Error("Cuenta por pagar no encontrada");
  const { saldo } = cpRow;
  const nuevoSaldo = saldo - valorAbono;
  const nuevoEstado = nuevoSaldo <= 0 ? "C" : "P";
  const fechaHoy = today();

  await dbTransaction([
    {
      sql: `UPDATE ctas_por_pagar SET pagado = pagado + $1, saldo = $2, estado = $3 WHERE id = $4`,
      params: [valorAbono, Math.max(0, nuevoSaldo), nuevoEstado, id],
    },
    {
      sql: `INSERT INTO mov_caja (referencia, fecha, natural, concepto, valor, val_egre, usuario)
            VALUES ($1,$2,'E',$3,$4,$5,$6)`,
      params: [
        `CxP-${id}`, fechaHoy,
        `Abono Cuenta por Pagar ID ${id}`,
        valorAbono, valorAbono, usuario,
      ],
    },
  ]);
}
