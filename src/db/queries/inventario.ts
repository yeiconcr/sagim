import { dbSelect, dbExecute } from '../useDb';
import type { Inventario, Kardex, QueryParams, PaginatedResult } from '../types';

// =============================================
// INVENTARIO
// =============================================

export async function getInventario(
  params: QueryParams = {}
): Promise<PaginatedResult<Inventario>> {
  const { page = 1, pageSize = 50, search = '', estado = 'todos' } = params;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push(`(i.codigo LIKE $${args.length + 1} OR i.nombre LIKE $${args.length + 2})`);
    args.push(`%${search}%`, `%${search}%`);
  }
  if (estado !== 'todos') {
    conditions.push(`i.estado = $${args.length + 1}`);
    args.push(estado);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRows = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM inventario i ${where}`,
    args
  );
  const total = countRows[0]?.c ?? 0;

  const data = await dbSelect<Inventario>(
    `
    SELECT i.*,
      (i.precio_compra + (i.precio_compra * i.ganancia / 100)) as precio_venta,
      p.nombre as nombre_proveedor
    FROM inventario i
    LEFT JOIN proveedores p ON p.id = i.id_proveedor
    ${where}
    ORDER BY i.nombre ASC
    LIMIT $${args.length + 1} OFFSET $${args.length + 2}
  `,
    [...args, pageSize, offset]
  );

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getArticuloByCodigo(codigo: string): Promise<Inventario | null> {
  const rows = await dbSelect<Inventario>(
    `
    SELECT i.*,
      (i.precio_compra + (i.precio_compra * i.ganancia / 100)) as precio_venta,
      p.nombre as nombre_proveedor
    FROM inventario i
    LEFT JOIN proveedores p ON p.id = i.id_proveedor
    WHERE i.codigo = $1
  `,
    [codigo]
  );
  return rows[0] ?? null;
}

export async function articuloCodigoExiste(codigo: string): Promise<boolean> {
  const result = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM inventario WHERE codigo = $1',
    [codigo]
  );
  return (result[0]?.c ?? 0) > 0;
}

export async function articuloEnUso(codigo: string): Promise<boolean> {
  // Verificar si tiene movimientos en kardex, ventas o compras
  const kardex = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM kardex WHERE codigo_art = $1',
    [codigo]
  );
  if ((kardex[0]?.c ?? 0) > 0) return true;

  const ventasDet = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM det_factu_tienda WHERE codigo = $1',
    [codigo]
  );
  if ((ventasDet[0]?.c ?? 0) > 0) return true;

  const comprasDet = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM det_compra WHERE codigo = $1',
    [codigo]
  );
  return (comprasDet[0]?.c ?? 0) > 0;
}

export async function createArticulo(
  data: Omit<Inventario, 'id' | 'precio_venta' | 'nombre_proveedor'>
): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO inventario (codigo, nombre, descripcion, stock, unidad_medida,
      precio_compra, ganancia, impuesto, ubicacion, id_proveedor, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      data.codigo,
      data.nombre,
      data.descripcion,
      data.stock,
      data.unidad_medida,
      data.precio_compra,
      data.ganancia,
      data.impuesto,
      data.ubicacion,
      data.id_proveedor,
      data.estado,
    ]
  );
  return r.lastInsertId;
}

export async function updateArticulo(
  codigo: string,
  data: Partial<Omit<Inventario, 'id' | 'codigo' | 'precio_venta' | 'nombre_proveedor'>>
): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE inventario SET ${sets} WHERE codigo = $${fields.length + 1}`, [
    ...values,
    codigo,
  ]);
}

export async function updateStock(codigo: string, nuevoCantidad: number): Promise<void> {
  await dbExecute('UPDATE inventario SET stock = $1 WHERE codigo = $2', [nuevoCantidad, codigo]);
}

export async function incrementarStock(codigo: string, cantidad: number): Promise<void> {
  await dbExecute('UPDATE inventario SET stock = stock + $1 WHERE codigo = $2', [cantidad, codigo]);
}

export async function decrementarStock(codigo: string, cantidad: number): Promise<void> {
  await dbExecute('UPDATE inventario SET stock = stock - $1 WHERE codigo = $2', [cantidad, codigo]);
}

export async function toggleArticuloEstado(codigo: string, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE inventario SET estado = $1 WHERE codigo = $2', [estado, codigo]);
}

// =============================================
// KARDEX
// =============================================

export async function getKardexByArticulo(
  codigoArt: string,
  fechaDesde?: string,
  fechaHasta?: string
): Promise<Kardex[]> {
  const conditions = ['codigo_art = $1'];
  const args: unknown[] = [codigoArt];

  if (fechaDesde) {
    conditions.push(`fecha >= $${args.length + 1}`);
    args.push(fechaDesde);
  }
  if (fechaHasta) {
    conditions.push(`fecha <= $${args.length + 1}`);
    args.push(fechaHasta);
  }

  const rows = await dbSelect<Kardex>(
    `SELECT * FROM kardex WHERE ${conditions.join(' AND ')} ORDER BY fecha ASC, id ASC`,
    args
  );

  // Calcular saldo acumulado
  let saldo = 0;
  return rows.map((row) => {
    saldo += row.total_in - row.total_sa;
    return { ...row, saldo };
  });
}

export async function createKardexEntrada(
  codigoArt: string,
  fecha: string,
  detalle: string,
  cantidad: number,
  punitario: number
): Promise<void> {
  await dbExecute(
    `INSERT INTO kardex (codigo_art, fecha, detalle, cantidad_in, punitario_in, total_in)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [codigoArt, fecha, detalle, cantidad, punitario, cantidad * punitario]
  );
}

export async function createKardexSalida(
  codigoArt: string,
  fecha: string,
  detalle: string,
  cantidad: number,
  punitario: number
): Promise<void> {
  await dbExecute(
    `INSERT INTO kardex (codigo_art, fecha, detalle, cantidad_sa, punitario_sa, total_sa)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [codigoArt, fecha, detalle, cantidad, punitario, cantidad * punitario]
  );
}

export async function getSiguienteCodigoArticulo(): Promise<string> {
  const rows = await dbSelect('SELECT codigo FROM inventario');
  let maxCode = 1000;
  for (const row of rows as any[]) {
    const num = parseInt(row.codigo, 10);
    if (!isNaN(num) && num > maxCode) {
      maxCode = num;
    }
  }
  return String(maxCode + 1);
}
