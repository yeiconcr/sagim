import { dbSelect, dbExecute } from "../useDb";
import type { Especialidad, Actividad, FormaPago, Instructor, Proveedor } from "../types";

// =============================================
// ESPECIALIDADES
// =============================================

export async function getEspecialidades(soloActivas = true): Promise<Especialidad[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : "";
  return dbSelect<Especialidad>(`SELECT * FROM especialidades ${where} ORDER BY nombre ASC`);
}

export async function createEspecialidad(nombre: string): Promise<number> {
  const r = await dbExecute("INSERT INTO especialidades (nombre) VALUES ($1)", [nombre]);
  return r.lastInsertId;
}

export async function updateEspecialidad(id: number, nombre: string): Promise<void> {
  await dbExecute("UPDATE especialidades SET nombre = $1 WHERE id = $2", [nombre, id]);
}

export async function toggleEspecialidadEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE especialidades SET estado = $1 WHERE id = $2", [estado, id]);
}

// =============================================
// ACTIVIDADES
// =============================================

export async function getActividades(soloActivas = true): Promise<Actividad[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : "";
  return dbSelect<Actividad>(`SELECT * FROM actividades ${where} ORDER BY nombre ASC`);
}

export async function getActividadByCodigo(codigo: string): Promise<Actividad | null> {
  const rows = await dbSelect<Actividad>(
    "SELECT * FROM actividades WHERE codigo = $1",
    [codigo]
  );
  return rows[0] ?? null;
}

export async function createActividad(data: Omit<Actividad, "id">): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO actividades (codigo, nombre, tarifa, factor, periodicidad, impuesto, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [data.codigo, data.nombre, data.tarifa, data.factor, data.periodicidad, data.impuesto, data.estado]
  );
  return r.lastInsertId;
}

export async function updateActividad(id: number, data: Partial<Omit<Actividad, "id">>): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE actividades SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function toggleActividadEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE actividades SET estado = $1 WHERE id = $2", [estado, id]);
}

// =============================================
// FORMA DE PAGO
// =============================================

export async function getFormasPago(soloActivas = true): Promise<FormaPago[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : "";
  return dbSelect<FormaPago>(`SELECT * FROM forma_pago ${where} ORDER BY detalle ASC`);
}

export async function createFormaPago(detalle: string, plazo_dias: number): Promise<number> {
  const r = await dbExecute(
    "INSERT INTO forma_pago (detalle, plazo_dias) VALUES ($1, $2)",
    [detalle, plazo_dias]
  );
  return r.lastInsertId;
}

export async function updateFormaPago(id: number, detalle: string, plazo_dias: number): Promise<void> {
  await dbExecute(
    "UPDATE forma_pago SET detalle = $1, plazo_dias = $2 WHERE id = $3",
    [detalle, plazo_dias, id]
  );
}

export async function toggleFormaPagoEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE forma_pago SET estado = $1 WHERE id = $2", [estado, id]);
}

// =============================================
// INSTRUCTORES
// =============================================

export async function getInstructores(soloActivos = true): Promise<Instructor[]> {
  const where = soloActivos ? "WHERE i.estado = 'A'" : "";
  return dbSelect<Instructor>(`
    SELECT i.*, e.nombre as nombre_especialidad
    FROM instructores i
    LEFT JOIN especialidades e ON e.id = i.id_especialidad
    ${where}
    ORDER BY i.nombres ASC
  `);
}

export async function getInstructorById(id: number): Promise<Instructor | null> {
  const rows = await dbSelect<Instructor>(
    `SELECT i.*, e.nombre as nombre_especialidad
     FROM instructores i
     LEFT JOIN especialidades e ON e.id = i.id_especialidad
     WHERE i.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createInstructor(data: Omit<Instructor, "id" | "nombre_especialidad">): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO instructores (cedula, nombres, apellidos, direccion, telefono,
      celular, email, id_especialidad, tarifa, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      data.cedula, data.nombres, data.apellidos, data.direccion,
      data.telefono, data.celular, data.email, data.id_especialidad,
      data.tarifa, data.estado,
    ]
  );
  return r.lastInsertId;
}

export async function updateInstructor(id: number, data: Partial<Omit<Instructor, "id" | "nombre_especialidad">>): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE instructores SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function toggleInstructorEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE instructores SET estado = $1 WHERE id = $2", [estado, id]);
}

// =============================================
// PROVEEDORES
// =============================================

export async function getProveedores(soloActivos = true): Promise<Proveedor[]> {
  const where = soloActivos ? "WHERE estado = 'A'" : "";
  return dbSelect<Proveedor>(`SELECT * FROM proveedores ${where} ORDER BY nombre ASC`);
}

export async function getProveedorById(id: number): Promise<Proveedor | null> {
  const rows = await dbSelect<Proveedor>("SELECT * FROM proveedores WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createProveedor(data: Omit<Proveedor, "id">): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO proveedores (nit, nombre, direccion, telefono, ciudad, contacto, email, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [data.nit, data.nombre, data.direccion, data.telefono, data.ciudad, data.contacto, data.email, data.estado]
  );
  return r.lastInsertId;
}

export async function updateProveedor(id: number, data: Partial<Omit<Proveedor, "id">>): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE proveedores SET ${sets} WHERE id = $${fields.length + 1}`, [...values, id]);
}

export async function toggleProveedorEstado(id: number, estado: "A" | "I"): Promise<void> {
  await dbExecute("UPDATE proveedores SET estado = $1 WHERE id = $2", [estado, id]);
}
