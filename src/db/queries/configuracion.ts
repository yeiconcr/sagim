import { dbSelect, dbExecute } from "../useDb";
import type { Parametros, Usuario } from "../types";
import bcrypt from "bcryptjs";

// =============================================
// PARÁMETROS
// =============================================

export async function getParametros(): Promise<Parametros | null> {
  const rows = await dbSelect<Parametros>("SELECT * FROM parametros LIMIT 1");
  return rows[0] ?? null;
}

export async function updateParametros(data: Partial<Omit<Parametros, "id">>): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE parametros SET ${sets} WHERE id = 1`, values);
}

// =============================================
// USUARIOS
// =============================================

export async function getUsuarios(): Promise<Omit<Usuario, "password_hash">[]> {
  return dbSelect<Omit<Usuario, "password_hash">>(
    "SELECT id, nombre, cargo, nivel, estado, fecha_creacion FROM usuarios ORDER BY nombre ASC"
  );
}

export async function getUsuarioByNombre(nombre: string): Promise<Usuario | null> {
  const rows = await dbSelect<Usuario>(
    "SELECT * FROM usuarios WHERE nombre = $1 AND estado = 'A'",
    [nombre]
  );
  return rows[0] ?? null;
}

export async function createUsuario(
  nombre: string,
  password: string,
  cargo: string,
  nivel: 1 | 2
): Promise<number> {
  const hash = await bcrypt.hash(password, 10);
  const r = await dbExecute(
    "INSERT INTO usuarios (nombre, password_hash, cargo, nivel) VALUES ($1,$2,$3,$4)",
    [nombre, hash, cargo, nivel]
  );
  return r.lastInsertId;
}

export async function updateUsuario(
  id: number,
  data: { cargo?: string; nivel?: 1 | 2; estado?: "A" | "I" }
): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE usuarios SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function cambiarPassword(id: number, nuevaPassword: string): Promise<void> {
  const hash = await bcrypt.hash(nuevaPassword, 10);
  await dbExecute("UPDATE usuarios SET password_hash = $1 WHERE id = $2", [hash, id]);
}

export async function toggleUsuarioEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE usuarios SET estado = $1 WHERE id = $2", [estado, id]);
}
