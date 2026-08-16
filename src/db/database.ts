/**
 * Módulo principal de base de datos SAGIM.
 * Usa @tauri-apps/plugin-sql con SQLite.
 * La BD se almacena en el directorio de datos de la app (gestionado por Tauri).
 */

import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    throw new Error("Base de datos no inicializada. Llame initDatabase() primero.");
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  console.log("[SAGIM] Conectando a base de datos SQLite...");

  db = await Database.load("sqlite:sagim.db");

  // Crear todas las tablas
  await createTables(db);

  // Insertar datos semilla si es primera vez
  await seedInitialData(db);

  console.log("[SAGIM] Base de datos inicializada correctamente — 24 tablas");
}

async function createTables(db: Database): Promise<void> {
  // Ejecutar cada bloque CREATE TABLE individualmente
  const tables = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      cargo TEXT,
      nivel INTEGER NOT NULL DEFAULT 2,
      estado TEXT NOT NULL DEFAULT 'A',
      fecha_creacion TEXT NOT NULL DEFAULT (date('now')),
      creado_por TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS parametros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_gimnasio TEXT NOT NULL DEFAULT 'MI GIMNASIO',
      nit TEXT,
      direccion TEXT,
      telefono TEXT,
      logo_path TEXT,
      conse_ins INTEGER NOT NULL DEFAULT 1,
      conse_rec INTEGER NOT NULL DEFAULT 1,
      conse_fac INTEGER NOT NULL DEFAULT 1,
      dias_inactivar INTEGER NOT NULL DEFAULT 90,
      dias_alerta_vencimiento INTEGER NOT NULL DEFAULT 5
    )`,

    `CREATE TABLE IF NOT EXISTS especialidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE TABLE IF NOT EXISTS actividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      tarifa REAL NOT NULL DEFAULT 0,
      factor INTEGER NOT NULL DEFAULT 30,
      periodicidad TEXT NOT NULL DEFAULT 'M',
      impuesto REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE TABLE IF NOT EXISTS forma_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      detalle TEXT NOT NULL,
      plazo_dias INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nit TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      ciudad TEXT,
      contacto TEXT,
      email TEXT,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE TABLE IF NOT EXISTS instructores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      celular TEXT,
      email TEXT,
      id_especialidad INTEGER,
      tarifa REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL UNIQUE,
      cedula TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      celular TEXT,
      email TEXT,
      ciudad TEXT DEFAULT 'PALMIRA',
      sexo TEXT,
      fecha_inscripcion TEXT,
      fecha_nacimiento TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      foto_path TEXT,
      fecha_creacion TEXT NOT NULL DEFAULT (date('now'))
    )`,

    `CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula)`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_inscripcion ON clientes(inscripcion)`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado)`,

    `CREATE TABLE IF NOT EXISTS medidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      peso REAL,
      talla REAL,
      cintura REAL,
      brazos REAL,
      muslos REAL,
      pantorrilla REAL,
      torax REAL,
      cadera REAL,
      estatura REAL
    )`,

    `CREATE INDEX IF NOT EXISTS idx_medidas_inscripcion ON medidas(inscripcion)`,

    `CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      stock REAL NOT NULL DEFAULT 0,
      unidad_medida TEXT DEFAULT 'UND',
      precio_compra REAL NOT NULL DEFAULT 0,
      ganancia REAL NOT NULL DEFAULT 0,
      impuesto REAL NOT NULL DEFAULT 0,
      ubicacion TEXT,
      id_proveedor INTEGER,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_inventario_codigo ON inventario(codigo)`,

    `CREATE TABLE IF NOT EXISTS kardex (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_art TEXT NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      detalle TEXT,
      cantidad_in REAL DEFAULT 0,
      punitario_in REAL DEFAULT 0,
      total_in REAL DEFAULT 0,
      cantidad_sa REAL DEFAULT 0,
      punitario_sa REAL DEFAULT 0,
      total_sa REAL DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_kardex_codigo ON kardex(codigo_art)`,
    `CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON kardex(fecha)`,

    `CREATE TABLE IF NOT EXISTS recibos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      hora TEXT,
      cedula TEXT,
      inscripcion INTEGER,
      observaciones TEXT,
      valor_letras TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      fecha_anulacion TEXT,
      hora_anulacion TEXT,
      usuario_anulacion TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_recibos_cedula ON recibos(cedula)`,
    `CREATE INDEX IF NOT EXISTS idx_recibos_fecha ON recibos(fecha)`,

    `CREATE TABLE IF NOT EXISTS det_recibo_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1,
      punitario REAL NOT NULL DEFAULT 0,
      descuento REAL DEFAULT 0,
      impuesto REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      unmed TEXT DEFAULT 'SRV'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_det_recibo_nro ON det_recibo_pago(nro_docu)`,

    `CREATE TABLE IF NOT EXISTS pagos_cli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL,
      fecha_pag TEXT NOT NULL DEFAULT (date('now')),
      id_actividad TEXT,
      valor REAL NOT NULL DEFAULT 0,
      periodicidad TEXT DEFAULT 'M',
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      nro_recibo INTEGER
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pagos_cli_inscripcion ON pagos_cli(inscripcion)`,
    `CREATE INDEX IF NOT EXISTS idx_pagos_cli_fecha ON pagos_cli(fecha_pag)`,

    `CREATE TABLE IF NOT EXISTS factu_tienda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      hora TEXT,
      cedula TEXT,
      id_forma_pago INTEGER,
      plazo INTEGER NOT NULL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      valor_letras TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      fecha_anulacion TEXT,
      hora_anulacion TEXT,
      usuario_anulacion TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_factu_tienda_cedula ON factu_tienda(cedula)`,
    `CREATE INDEX IF NOT EXISTS idx_factu_tienda_fecha ON factu_tienda(fecha)`,

    `CREATE TABLE IF NOT EXISTS det_factu_tienda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1,
      punitario REAL NOT NULL DEFAULT 0,
      descuento REAL DEFAULT 0,
      impuesto REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      unmed TEXT DEFAULT 'UND'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_det_factu_nro ON det_factu_tienda(nro_docu)`,

    `CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      id_proveedor INTEGER,
      nro_documento TEXT,
      total REAL NOT NULL DEFAULT 0,
      id_forma_pago INTEGER,
      plazo INTEGER DEFAULT 0,
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'A'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha)`,

    `CREATE TABLE IF NOT EXISTS det_compra (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1,
      punitario REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_det_compra_nro ON det_compra(nro_compra)`,

    `CREATE TABLE IF NOT EXISTS mov_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referencia TEXT,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      cedula TEXT,
      concepto TEXT,
      natural TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      val_ingre REAL DEFAULT 0,
      val_egre REAL DEFAULT 0,
      usuario TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_mov_caja_fecha ON mov_caja(fecha)`,

    `CREATE TABLE IF NOT EXISTS ctas_por_cobrar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      num_mov INTEGER NOT NULL,
      id_cliente TEXT NOT NULL,
      num_docu TEXT,
      id_tipomo TEXT NOT NULL,
      fecha_doc TEXT NOT NULL DEFAULT (date('now')),
      fecha_ven TEXT,
      concemo TEXT,
      importe REAL DEFAULT 0,
      pago_clien REAL DEFAULT 0,
      diferencia REAL DEFAULT 0,
      saldo_clien REAL DEFAULT 0,
      separado INTEGER DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_ctas_cobrar_cliente ON ctas_por_cobrar(id_cliente)`,

    `CREATE TABLE IF NOT EXISTS ctas_por_pagar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER,
      id_proveedor INTEGER,
      fecha_doc TEXT NOT NULL DEFAULT (date('now')),
      fecha_ven TEXT,
      importe REAL DEFAULT 0,
      pagado REAL DEFAULT 0,
      saldo REAL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'P'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_ctas_pagar_proveedor ON ctas_por_pagar(id_proveedor)`,

    `CREATE TABLE IF NOT EXISTS cuotas_cli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente TEXT NOT NULL,
      num_doc TEXT,
      nro_cuota INTEGER NOT NULL,
      id_tipomo TEXT DEFAULT 'FA',
      vencim TEXT,
      importe_total REAL DEFAULT 0,
      tmp_importe REAL DEFAULT 0,
      pagado REAL DEFAULT 0,
      tmp_pagado REAL DEFAULT 0,
      marca TEXT DEFAULT ' ',
      separado INTEGER DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'P'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_cuotas_cliente ON cuotas_cli(id_cliente)`,

    `CREATE TABLE IF NOT EXISTS abono_cuota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cuota INTEGER,
      num_docu TEXT,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      valor REAL NOT NULL DEFAULT 0,
      concepto TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS pagos_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_instructor INTEGER NOT NULL,
      id_especialidad INTEGER,
      fecha_pag TEXT NOT NULL DEFAULT (date('now')),
      periodo_ini TEXT,
      periodo_fin TEXT,
      valor REAL NOT NULL DEFAULT 0,
      observaciones TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_pagos_ins_instructor ON pagos_ins(id_instructor)`,
    `CREATE INDEX IF NOT EXISTS idx_pagos_ins_fecha ON pagos_ins(fecha_pag)`,

    // Índices compuestos para queries frecuentes y costosas
    `CREATE INDEX IF NOT EXISTS idx_pagos_cli_estado_periodo ON pagos_cli(estado, periodicidad, inscripcion, fecha_pag)`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_estado_nombre ON clientes(estado, nombres, apellidos)`,
    `CREATE INDEX IF NOT EXISTS idx_recibos_fecha_estado ON recibos(fecha, estado)`,
    `CREATE INDEX IF NOT EXISTS idx_mov_caja_fecha_natural ON mov_caja(fecha, natural)`,
    `CREATE INDEX IF NOT EXISTS idx_factu_fecha_estado ON factu_tienda(fecha, estado)`,
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }
}

async function seedInitialData(db: Database): Promise<void> {
  // Parámetros iniciales
  const params = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM parametros");
  if (params[0].c === 0) {
    await db.execute(
      `INSERT INTO parametros (nombre_gimnasio, nit, direccion, telefono,
        conse_ins, conse_rec, conse_fac, dias_inactivar, dias_alerta_vencimiento)
       VALUES ('MI GIMNASIO', '', '', '', 1, 1, 1, 90, 5)`
    );
  }

  // Formas de pago semilla
  const formas = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM forma_pago");
  if (formas[0].c === 0) {
    const formasData = [
      ["Efectivo", 0],
      ["Tarjeta Débito", 0],
      ["Tarjeta Crédito", 30],
      ["Transferencia", 0],
      ["Crédito 30 días", 30],
      ["Crédito 60 días", 60],
    ];
    for (const [detalle, plazo] of formasData) {
      await db.execute(
        "INSERT INTO forma_pago (detalle, plazo_dias) VALUES ($1, $2)",
        [detalle, plazo]
      );
    }
  }

  // Usuario admin por defecto
  const users = await db.select<[{ c: number }]>("SELECT COUNT(*) as c FROM usuarios");
  if (users[0].c === 0) {
    // Hash bcrypt de 'sagim123' con salt rounds=10
    await db.execute(
      `INSERT INTO usuarios (nombre, password_hash, cargo, nivel)
       VALUES ('admin', '$2b$10$HHSTs3XNrBdL1LCMR8dDye07Vv1PV3d69vRvHuvrOi7agPoEjiobq', 'Administrador', 1)`
    );
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
