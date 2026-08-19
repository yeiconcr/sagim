import { dbSelect, dbExecute } from '../useDb';
import type { Parametros, Usuario } from '../types';
import bcrypt from 'bcryptjs';

// =============================================
// PARÁMETROS
// =============================================

export async function getParametros(): Promise<Parametros | null> {
  const rows = await dbSelect<Parametros>('SELECT * FROM parametros LIMIT 1');
  return rows[0] ?? null;
}

export async function updateParametros(
  params: Partial<Omit<Parametros, 'id' | 'conse_ins' | 'conse_rec' | 'conse_fac'>>
): Promise<void> {
  await dbExecute(
    `UPDATE parametros SET 
      nombre_gimnasio = COALESCE($1, nombre_gimnasio),
      nit = $2,
      direccion = $3,
      telefono = $4,
      dias_inactivar = COALESCE($5, dias_inactivar),
      dias_alerta_vencimiento = COALESCE($6, dias_alerta_vencimiento),
      logo_path = $7,
      mensaje_recibo = $8,
      texto_resolucion = $9,
      formato_impresora = COALESCE($10, formato_impresora),
      color_primario = COALESCE($11, color_primario),
      iva_por_defecto = COALESCE($12, iva_por_defecto),
      permitir_sin_stock = COALESCE($13, permitir_sin_stock)
     WHERE id = 1`,
    [
      params.nombre_gimnasio,
      params.nit,
      params.direccion,
      params.telefono,
      params.dias_inactivar,
      params.dias_alerta_vencimiento,
      params.logo_path,
      params.mensaje_recibo,
      params.texto_resolucion,
      params.formato_impresora,
      params.color_primario,
      params.iva_por_defecto,
      params.permitir_sin_stock,
    ]
  );
}

// =============================================
// USUARIOS
// =============================================

export async function getUsuarios(): Promise<Omit<Usuario, 'password_hash'>[]> {
  return dbSelect<Omit<Usuario, 'password_hash'>>(
    'SELECT id, nombre, cargo, nivel, estado, fecha_creacion FROM usuarios ORDER BY nombre ASC'
  );
}

export async function getUsuarioByNombre(nombre: string): Promise<Usuario | null> {
  const rows = await dbSelect<Usuario>(
    "SELECT * FROM usuarios WHERE nombre = $1 AND estado = 'A'",
    [nombre]
  );
  return rows[0] ?? null;
}

export async function usuarioNombreExiste(nombre: string, excludeId?: number): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM usuarios WHERE LOWER(nombre) = LOWER($1) AND id != $2'
    : 'SELECT COUNT(*) as c FROM usuarios WHERE LOWER(nombre) = LOWER($1)';
  const params = excludeId ? [nombre, excludeId] : [nombre];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function createUsuario(
  nombre: string,
  password: string,
  cargo: string,
  nivel: 1 | 2
): Promise<number> {
  const hash = await bcrypt.hash(password, 10);
  const r = await dbExecute(
    'INSERT INTO usuarios (nombre, password_hash, cargo, nivel) VALUES ($1,$2,$3,$4)',
    [nombre, hash, cargo, nivel]
  );
  return r.lastInsertId;
}

export async function updateUsuario(
  id: number,
  data: { cargo?: string; nivel?: 1 | 2; estado?: 'A' | 'I' }
): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE usuarios SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function cambiarPassword(id: number, nuevaPassword: string): Promise<void> {
  const hash = await bcrypt.hash(nuevaPassword, 10);
  await dbExecute('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, id]);
}

export async function toggleUsuarioEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE usuarios SET estado = $1 WHERE id = $2', [estado, id]);
}
