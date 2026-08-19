import { dbSelect, dbExecute } from '../useDb';
import type {
  Especialidad,
  Actividad,
  FormaPago,
  Instructor,
  Proveedor,
  EspecialidadInstructor,
} from '../types';

// =============================================
// ESPECIALIDADES
// =============================================

export async function getEspecialidades(soloActivas = true): Promise<Especialidad[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : '';
  return dbSelect<Especialidad>(`SELECT * FROM especialidades ${where} ORDER BY nombre ASC`);
}

export async function especialidadNombreExiste(
  nombre: string,
  excludeId?: number
): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM especialidades WHERE LOWER(nombre) = LOWER($1) AND id != $2'
    : 'SELECT COUNT(*) as c FROM especialidades WHERE LOWER(nombre) = LOWER($1)';
  const params = excludeId ? [nombre, excludeId] : [nombre];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function createEspecialidad(nombre: string): Promise<number> {
  const r = await dbExecute('INSERT INTO especialidades (nombre) VALUES ($1)', [nombre]);
  return r.lastInsertId;
}

export async function updateEspecialidad(id: number, nombre: string): Promise<void> {
  await dbExecute('UPDATE especialidades SET nombre = $1 WHERE id = $2', [nombre, id]);
}

export async function toggleEspecialidadEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE especialidades SET estado = $1 WHERE id = $2', [estado, id]);
}

export async function especialidadEnUso(id: number): Promise<boolean> {
  const result = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM instructor_especialidades WHERE id_especialidad = $1',
    [id]
  );
  return (result[0]?.c ?? 0) > 0;
}

// =============================================
// ACTIVIDADES
// =============================================

export async function getActividades(soloActivas = true): Promise<Actividad[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : '';
  return dbSelect<Actividad>(`SELECT * FROM actividades ${where} ORDER BY nombre ASC`);
}

export async function getActividadByCodigo(codigo: string): Promise<Actividad | null> {
  const rows = await dbSelect<Actividad>('SELECT * FROM actividades WHERE codigo = $1', [codigo]);
  return rows[0] ?? null;
}

export async function actividadCodigoExiste(codigo: string, excludeId?: number): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM actividades WHERE codigo = $1 AND id != $2'
    : 'SELECT COUNT(*) as c FROM actividades WHERE codigo = $1';
  const params = excludeId ? [codigo, excludeId] : [codigo];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function createActividad(data: Omit<Actividad, 'id'>): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO actividades (codigo, nombre, tarifa, factor, periodicidad, impuesto, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      data.codigo,
      data.nombre,
      data.tarifa,
      data.factor,
      data.periodicidad,
      data.impuesto,
      data.estado,
    ]
  );
  return r.lastInsertId;
}

export async function updateActividad(
  id: number,
  data: Partial<Omit<Actividad, 'id'>>
): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE actividades SET ${sets} WHERE id = $${fields.length + 1}`, [
    ...values,
    id,
  ]);
}

export async function toggleActividadEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE actividades SET estado = $1 WHERE id = $2', [estado, id]);
}

export async function actividadEnUso(id: number): Promise<boolean> {
  // Verificar si hay pagos de clientes con esta actividad
  const result = await dbSelect<{ c: number }>(
    `SELECT COUNT(*) as c FROM pagos_cli WHERE id_actividad = $1`,
    [id]
  );
  return (result[0]?.c ?? 0) > 0;
}

// =============================================
// FORMA DE PAGO
// =============================================

export async function getFormasPago(soloActivas = true): Promise<FormaPago[]> {
  const where = soloActivas ? "WHERE estado = 'A'" : '';
  return dbSelect<FormaPago>(`SELECT * FROM forma_pago ${where} ORDER BY detalle ASC`);
}

export async function formaPagoDetalleExiste(
  detalle: string,
  excludeId?: number
): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM forma_pago WHERE LOWER(detalle) = LOWER($1) AND id != $2'
    : 'SELECT COUNT(*) as c FROM forma_pago WHERE LOWER(detalle) = LOWER($1)';
  const params = excludeId ? [detalle, excludeId] : [detalle];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function createFormaPago(detalle: string, plazo_dias: number): Promise<number> {
  const r = await dbExecute('INSERT INTO forma_pago (detalle, plazo_dias) VALUES ($1, $2)', [
    detalle,
    plazo_dias,
  ]);
  return r.lastInsertId;
}

export async function updateFormaPago(
  id: number,
  detalle: string,
  plazo_dias: number
): Promise<void> {
  await dbExecute('UPDATE forma_pago SET detalle = $1, plazo_dias = $2 WHERE id = $3', [
    detalle,
    plazo_dias,
    id,
  ]);
}

export async function toggleFormaPagoEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE forma_pago SET estado = $1 WHERE id = $2', [estado, id]);
}

export async function formaPagoEnUso(id: number): Promise<boolean> {
  // Verificar recibos gym
  const recibos = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM recibos WHERE id_forma_pago = $1',
    [id]
  );
  if ((recibos[0]?.c ?? 0) > 0) return true;

  // Verificar facturas tienda
  const facturas = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM factu_tienda WHERE id_forma_pago = $1',
    [id]
  );
  if ((facturas[0]?.c ?? 0) > 0) return true;

  // Verificar compras
  const compras = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM compras WHERE id_forma_pago = $1',
    [id]
  );
  return (compras[0]?.c ?? 0) > 0;
}

// =============================================
// INSTRUCTORES
// =============================================

export async function getInstructores(soloActivos = true): Promise<Instructor[]> {
  const where = soloActivos ? "WHERE i.estado = 'A'" : '';
  const instructores = await dbSelect<Instructor>(`
    SELECT i.*
    FROM instructores i
    ${where}
    ORDER BY i.nombres ASC
  `);

  // Cargar especialidades para cada instructor
  for (const inst of instructores) {
    inst.especialidades = await getEspecialidadesInstructor(inst.id);
  }

  return instructores;
}

export async function getInstructorById(id: number): Promise<Instructor | null> {
  const rows = await dbSelect<Instructor>(`SELECT * FROM instructores WHERE id = $1`, [id]);
  if (rows.length === 0) return null;

  const inst = rows[0];
  inst.especialidades = await getEspecialidadesInstructor(inst.id);
  return inst;
}

export async function getEspecialidadesInstructor(
  idInstructor: number
): Promise<EspecialidadInstructor[]> {
  return dbSelect<EspecialidadInstructor>(
    `
    SELECT e.id, e.nombre
    FROM especialidades e
    JOIN instructor_especialidades ie ON ie.id_especialidad = e.id
    WHERE ie.id_instructor = $1
    ORDER BY e.nombre ASC
  `,
    [idInstructor]
  );
}

export async function instructorCedulaExiste(cedula: string, excludeId?: number): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM instructores WHERE cedula = $1 AND id != $2'
    : 'SELECT COUNT(*) as c FROM instructores WHERE cedula = $1';
  const params = excludeId ? [cedula, excludeId] : [cedula];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function createInstructor(
  data: Omit<Instructor, 'id' | 'nombre_especialidad' | 'especialidades'>,
  especialidadesIds: number[] = []
): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO instructores (cedula, nombres, apellidos, direccion, telefono,
      celular, email, fecha_nacimiento, id_especialidad, tarifa, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      data.cedula,
      data.nombres,
      data.apellidos,
      data.direccion,
      data.telefono,
      data.celular,
      data.email,
      data.fecha_nacimiento,
      null, // id_especialidad legacy
      data.tarifa,
      data.estado,
    ]
  );

  // Agregar especialidades
  for (const espId of especialidadesIds) {
    await dbExecute(
      'INSERT INTO instructor_especialidades (id_instructor, id_especialidad) VALUES ($1, $2)',
      [r.lastInsertId, espId]
    );
  }

  return r.lastInsertId;
}

export async function updateInstructor(
  id: number,
  data: Partial<Omit<Instructor, 'id' | 'nombre_especialidad' | 'especialidades'>>,
  especialidadesIds?: number[]
): Promise<void> {
  const fields = Object.keys(data).filter((k) => k !== 'id_especialidad'); // Ignorar campo legacy
  if (fields.length > 0) {
    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => (data as Record<string, unknown>)[f]);
    await dbExecute(`UPDATE instructores SET ${sets} WHERE id = $${fields.length + 1}`, [
      ...values,
      id,
    ]);
  }

  // Actualizar especialidades si se proporcionan
  if (especialidadesIds !== undefined) {
    // Eliminar especialidades actuales
    await dbExecute('DELETE FROM instructor_especialidades WHERE id_instructor = $1', [id]);
    // Agregar nuevas
    for (const espId of especialidadesIds) {
      await dbExecute(
        'INSERT INTO instructor_especialidades (id_instructor, id_especialidad) VALUES ($1, $2)',
        [id, espId]
      );
    }
  }
}

export async function toggleInstructorEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE instructores SET estado = $1 WHERE id = $2', [estado, id]);
}

export async function instructorEnUso(id: number): Promise<boolean> {
  // Verificar si hay pagos a este instructor
  const pagos = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM pagos_ins WHERE id_instructor = $1',
    [id]
  );
  return (pagos[0]?.c ?? 0) > 0;
}

// =============================================
// PROVEEDORES
// =============================================

export async function getProveedores(soloActivos = true): Promise<Proveedor[]> {
  const where = soloActivos ? "WHERE estado = 'A'" : '';
  return dbSelect<Proveedor>(`SELECT * FROM proveedores ${where} ORDER BY nombre ASC`);
}

export async function proveedorNitExiste(nit: string, excludeId?: number): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as c FROM proveedores WHERE nit = $1 AND id != $2'
    : 'SELECT COUNT(*) as c FROM proveedores WHERE nit = $1';
  const params = excludeId ? [nit, excludeId] : [nit];
  const result = await dbSelect<{ c: number }>(query, params);
  return (result[0]?.c ?? 0) > 0;
}

export async function getProveedorById(id: number): Promise<Proveedor | null> {
  const rows = await dbSelect<Proveedor>('SELECT * FROM proveedores WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createProveedor(data: Omit<Proveedor, 'id'>): Promise<number> {
  const r = await dbExecute(
    `INSERT INTO proveedores (nit, nombre, direccion, telefono, ciudad, contacto, email, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      data.nit,
      data.nombre,
      data.direccion,
      data.telefono,
      data.ciudad,
      data.contacto,
      data.email,
      data.estado,
    ]
  );
  return r.lastInsertId;
}

export async function updateProveedor(
  id: number,
  data: Partial<Omit<Proveedor, 'id'>>
): Promise<void> {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  await dbExecute(`UPDATE proveedores SET ${sets} WHERE id = $${fields.length + 1}`, [
    ...values,
    id,
  ]);
}

export async function toggleProveedorEstado(id: number, estado: 'A' | 'I'): Promise<void> {
  await dbExecute('UPDATE proveedores SET estado = $1 WHERE id = $2', [estado, id]);
}

export async function proveedorEnUso(id: number): Promise<boolean> {
  // Verificar si hay compras con este proveedor
  const compras = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM compras WHERE id_proveedor = $1',
    [id]
  );
  if ((compras[0]?.c ?? 0) > 0) return true;

  // Verificar si hay artículos en inventario con este proveedor
  const articulos = await dbSelect<{ c: number }>(
    'SELECT COUNT(*) as c FROM inventario WHERE id_proveedor = $1',
    [id]
  );
  return (articulos[0]?.c ?? 0) > 0;
}
