#!/usr/bin/env node
/**
 * SAGIM — Script de Migración Access (.accdb) → SQLite
 * 
 * Uso:
 *   node src/migration/migrate.js [ruta-accdb] [ruta-sqlite]
 * 
 * Ejemplo:
 *   node src/migration/migrate.js "../SAGIM/BD/Datos.accdb" "./sagim.db"
 * 
 * Si no se pasan argumentos usa las rutas por defecto.
 */

const { default: MDBReader } = require("mdb-reader");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// =============================================
// CONFIGURACIÓN
// =============================================
const DEFAULT_ACCDB = path.resolve(__dirname, "../../SAGIM/BD/Datos.accdb");
// Tauri guarda la BD en ~/Library/Application Support/com.sagim.gimnasio/ en macOS
// y en %APPDATA%/com.sagim.gimnasio/ en Windows
const TAURI_DATA_DIR = process.platform === "darwin"
  ? path.join(process.env.HOME || "", "Library", "Application Support", "com.sagim.gimnasio")
  : path.join(process.env.APPDATA || "", "com.sagim.gimnasio");

const DEFAULT_SQLITE = path.join(TAURI_DATA_DIR, "sagim.db");

const ACCDB_PATH = process.argv[2] || DEFAULT_ACCDB;
const SQLITE_PATH = process.argv[3] || DEFAULT_SQLITE;
const FOTOS_DIR = path.join(path.dirname(SQLITE_PATH), "fotos");

// =============================================
// LOG
// =============================================
const logLines = [];
function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  logLines.push(line);
}
function logError(tabla, msg) {
  const line = `[ERROR] ${tabla}: ${msg}`;
  console.error(line);
  logLines.push(line);
}

// =============================================
// HELPERS
// =============================================
function toDate(val) {
  if (!val) return null;
  try {
    if (val instanceof Date) return val.toISOString().split("T")[0];
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function toStr(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
}

function toNum(val) {
  if (val === null || val === undefined) return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function toInt(val) {
  if (val === null || val === undefined) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Guarda imagen binaria como archivo JPG.
 * Access almacena fotos como OLE Object con cabecera de 78 bytes.
 */
function guardarFoto(binData, inscripcion) {
  if (!binData || binData.length === 0) return null;
  try {
    const buf = Buffer.isBuffer(binData) ? binData : Buffer.from(binData);
    if (buf.length < 100) return null;

    // Buscar inicio de datos JPG o BMP (saltar cabecera OLE de Access)
    // JPG: FF D8 FF | BMP: 42 4D | PNG: 89 50 4E 47
    let start = -1;
    for (let i = 0; i < Math.min(buf.length - 4, 300); i++) {
      // JPG
      if (buf[i] === 0xFF && buf[i + 1] === 0xD8 && buf[i + 2] === 0xFF) {
        start = i;
        break;
      }
      // BMP
      if (buf[i] === 0x42 && buf[i + 1] === 0x4D) {
        start = i;
        break;
      }
      // PNG
      if (buf[i] === 0x89 && buf[i + 1] === 0x50 && buf[i + 2] === 0x4E && buf[i + 3] === 0x47) {
        start = i;
        break;
      }
    }

    if (start === -1) return null;

    const imgBuf = buf.slice(start);
    const ext = buf[start] === 0x42 ? "bmp" : "jpg";
    const filename = `${inscripcion}.${ext}`;
    const filepath = path.join(FOTOS_DIR, filename);
    fs.writeFileSync(filepath, imgBuf);
    return filename;
  } catch (e) {
    return null;
  }
}

// =============================================
// TABLAS QUE SE IGNORAN (tablas internas de Access)
// =============================================
const TABLAS_IGNORADAS = new Set([
  "~TMPCLP1871", "~TMPCLP525511", "Errores de pegado",
  "MSysObjects", "MSysACEs", "MSysQueries", "MSysRelationships",
  "Ubicacion",
]);

// =============================================
// MAIN
// =============================================
async function main() {
  log("=".repeat(60));
  log("SAGIM — Migración Access → SQLite");
  log("=".repeat(60));
  log(`Origen:  ${ACCDB_PATH}`);
  log(`Destino: ${SQLITE_PATH}`);
  log(`Fotos:   ${FOTOS_DIR}`);
  log("");

  // Verificar archivo Access
  if (!fs.existsSync(ACCDB_PATH)) {
    logError("SISTEMA", `Archivo .accdb no encontrado: ${ACCDB_PATH}`);
    process.exit(1);
  }

  // Crear directorio para SQLite y fotos
  const sqliteDir = path.dirname(SQLITE_PATH);
  if (!fs.existsSync(sqliteDir)) fs.mkdirSync(sqliteDir, { recursive: true });
  if (!fs.existsSync(FOTOS_DIR)) fs.mkdirSync(FOTOS_DIR, { recursive: true });

  // Si ya existe el SQLite, hacer backup
  if (fs.existsSync(SQLITE_PATH)) {
    const backup = SQLITE_PATH.replace(".db", `_backup_${Date.now()}.db`);
    fs.copyFileSync(SQLITE_PATH, backup);
    log(`Backup de BD existente creado: ${backup}`);
    fs.unlinkSync(SQLITE_PATH);
  }

  // Abrir Access
  log("Leyendo base de datos Access...");
  const accdbBuf = fs.readFileSync(ACCDB_PATH);
  const accdb = new MDBReader(accdbBuf);
  const tablasAccess = accdb.getTableNames().filter((t) => !TABLAS_IGNORADAS.has(t));
  log(`Tablas disponibles en Access: ${tablasAccess.length}`);

  // Abrir/Crear SQLite
  const sqlite = new Database(SQLITE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = OFF"); // OFF durante migración

  // Crear esquema completo
  log("Creando esquema SQLite...");
  crearEsquema(sqlite);
  log("Esquema creado.");
  log("");

  // Estadísticas
  const stats = {};

  // ---- MIGRAR TABLAS EN ORDEN ----
  const migrar = migracionFactory(accdb, sqlite, stats);

  migrar.parametros();
  migrar.especialidades();
  migrar.formaDePago();
  migrar.proveedores();
  migrar.instructores();
  migrar.actividades();
  migrar.clientes();
  migrar.medidas();
  migrar.inventario();
  migrar.usuarios();
  migrar.pagosCli();
  migrar.recibos();
  migrar.detReciboPago();
  migrar.FactuTienda();
  migrar.detFactuTienda();
  migrar.compras();
  migrar.detCompra();
  migrar.movCaja();
  migrar.ctasPorCobrar();
  migrar.ctasPorPagar();
  migrar.cuotasCli();
  migrar.abonoCuota();
  migrar.pagosIns();

  sqlite.pragma("foreign_keys = ON");

  // ---- RESUMEN ----
  log("");
  log("=".repeat(60));
  log("RESUMEN DE MIGRACIÓN");
  log("=".repeat(60));
  let total = 0;
  for (const [tabla, { ok, errors }] of Object.entries(stats)) {
    const status = errors === 0 ? "✓" : "⚠";
    log(`  ${status} ${tabla.padEnd(22)} ${String(ok).padStart(6)} registros${errors > 0 ? `  (${errors} errores)` : ""}`);
    total += ok;
  }
  log(`${"".padEnd(40, "-")}`);
  log(`  TOTAL: ${total} registros migrados`);
  log("=".repeat(60));

  // Guardar log
  const logPath = path.join(sqliteDir, "migration_log.txt");
  fs.writeFileSync(logPath, logLines.join("\n"), "utf8");
  log(`\nLog guardado en: ${logPath}`);
  log("Migración completada exitosamente.");
  sqlite.close();
}

// =============================================
// ESQUEMA SQLite (igual que database.ts)
// =============================================
function crearEsquema(db) {
  const sql = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      cargo TEXT,
      nivel INTEGER NOT NULL DEFAULT 2,
      estado TEXT NOT NULL DEFAULT 'A',
      fecha_creacion TEXT NOT NULL DEFAULT (date('now')),
      creado_por TEXT
    );
    CREATE TABLE IF NOT EXISTS parametros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_gimnasio TEXT NOT NULL DEFAULT 'MI GIMNASIO',
      nit TEXT, direccion TEXT, telefono TEXT, logo_path TEXT,
      conse_ins INTEGER NOT NULL DEFAULT 1,
      conse_rec INTEGER NOT NULL DEFAULT 1,
      conse_fac INTEGER NOT NULL DEFAULT 1,
      dias_inactivar INTEGER NOT NULL DEFAULT 90,
      dias_alerta_vencimiento INTEGER NOT NULL DEFAULT 5
    );
    CREATE TABLE IF NOT EXISTS especialidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS actividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      tarifa REAL NOT NULL DEFAULT 0,
      factor INTEGER NOT NULL DEFAULT 30,
      periodicidad TEXT NOT NULL DEFAULT 'M',
      impuesto REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS forma_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      detalle TEXT NOT NULL,
      plazo_dias INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nit TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      direccion TEXT, telefono TEXT, ciudad TEXT, contacto TEXT, email TEXT,
      estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS instructores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      direccion TEXT, telefono TEXT, celular TEXT, email TEXT,
      id_especialidad INTEGER,
      tarifa REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL UNIQUE,
      cedula TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL, apellidos TEXT NOT NULL,
      direccion TEXT, telefono TEXT, celular TEXT, email TEXT,
      ciudad TEXT DEFAULT 'PALMIRA',
      sexo TEXT, fecha_inscripcion TEXT, fecha_nacimiento TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      foto_path TEXT,
      fecha_creacion TEXT NOT NULL DEFAULT (date('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON clientes(cedula);
    CREATE INDEX IF NOT EXISTS idx_clientes_inscripcion ON clientes(inscripcion);
    CREATE TABLE IF NOT EXISTS medidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      peso REAL, talla REAL, cintura REAL, brazos REAL,
      muslos REAL, pantorrilla REAL, torax REAL, cadera REAL, estatura REAL
    );
    CREATE INDEX IF NOT EXISTS idx_medidas_inscripcion ON medidas(inscripcion);
    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, descripcion TEXT,
      stock REAL NOT NULL DEFAULT 0, unidad_medida TEXT DEFAULT 'UND',
      precio_compra REAL NOT NULL DEFAULT 0, ganancia REAL NOT NULL DEFAULT 0,
      impuesto REAL NOT NULL DEFAULT 0,
      ubicacion TEXT, id_proveedor INTEGER, estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS kardex (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_art TEXT NOT NULL, fecha TEXT NOT NULL DEFAULT (date('now')),
      detalle TEXT,
      cantidad_in REAL DEFAULT 0, punitario_in REAL DEFAULT 0, total_in REAL DEFAULT 0,
      cantidad_sa REAL DEFAULT 0, punitario_sa REAL DEFAULT 0, total_sa REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS recibos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      hora TEXT, cedula TEXT, inscripcion INTEGER,
      observaciones TEXT, valor_letras TEXT,
      estado TEXT NOT NULL DEFAULT 'A',
      fecha_anulacion TEXT, hora_anulacion TEXT, usuario_anulacion TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_recibos_cedula ON recibos(cedula);
    CREATE INDEX IF NOT EXISTS idx_recibos_fecha ON recibos(fecha);
    CREATE TABLE IF NOT EXISTS det_recibo_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL, codigo TEXT NOT NULL, detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1,
      punitario REAL NOT NULL DEFAULT 0, descuento REAL DEFAULT 0,
      impuesto REAL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
      unmed TEXT DEFAULT 'SRV'
    );
    CREATE TABLE IF NOT EXISTS pagos_cli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion INTEGER NOT NULL,
      fecha_pag TEXT NOT NULL DEFAULT (date('now')),
      id_actividad TEXT, valor REAL NOT NULL DEFAULT 0,
      periodicidad TEXT DEFAULT 'M',
      observaciones TEXT, estado TEXT NOT NULL DEFAULT 'A', nro_recibo INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pagos_cli_inscripcion ON pagos_cli(inscripcion);
    CREATE TABLE IF NOT EXISTS factu_tienda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      hora TEXT, cedula TEXT, id_forma_pago INTEGER, plazo INTEGER NOT NULL DEFAULT 0,
      subtotal REAL DEFAULT 0, iva REAL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
      valor_letras TEXT, estado TEXT NOT NULL DEFAULT 'A',
      fecha_anulacion TEXT, hora_anulacion TEXT, usuario_anulacion TEXT
    );
    CREATE TABLE IF NOT EXISTS det_factu_tienda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_docu INTEGER NOT NULL, codigo TEXT NOT NULL, detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1, punitario REAL NOT NULL DEFAULT 0,
      descuento REAL DEFAULT 0, impuesto REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0, unmed TEXT DEFAULT 'UND'
    );
    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER NOT NULL UNIQUE,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      id_proveedor INTEGER, nro_documento TEXT,
      total REAL NOT NULL DEFAULT 0, id_forma_pago INTEGER, plazo INTEGER DEFAULT 0,
      observaciones TEXT, estado TEXT NOT NULL DEFAULT 'A'
    );
    CREATE TABLE IF NOT EXISTS det_compra (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER NOT NULL, codigo TEXT NOT NULL, detalle TEXT,
      cantidad REAL NOT NULL DEFAULT 1,
      punitario REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS mov_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referencia TEXT, fecha TEXT NOT NULL DEFAULT (date('now')),
      cedula TEXT, concepto TEXT,
      natural TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      val_ingre REAL DEFAULT 0, val_egre REAL DEFAULT 0, usuario TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mov_caja_fecha ON mov_caja(fecha);
    CREATE TABLE IF NOT EXISTS ctas_por_cobrar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      num_mov INTEGER NOT NULL, id_cliente TEXT NOT NULL,
      num_docu TEXT, id_tipomo TEXT NOT NULL,
      fecha_doc TEXT NOT NULL DEFAULT (date('now')),
      fecha_ven TEXT, concemo TEXT,
      importe REAL DEFAULT 0, pago_clien REAL DEFAULT 0,
      diferencia REAL DEFAULT 0, saldo_clien REAL DEFAULT 0,
      separado INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ctas_por_pagar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_compra INTEGER, id_proveedor INTEGER,
      fecha_doc TEXT NOT NULL DEFAULT (date('now')),
      fecha_ven TEXT,
      importe REAL DEFAULT 0, pagado REAL DEFAULT 0,
      saldo REAL DEFAULT 0, estado TEXT NOT NULL DEFAULT 'P'
    );
    CREATE TABLE IF NOT EXISTS cuotas_cli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente TEXT NOT NULL, num_doc TEXT, nro_cuota INTEGER NOT NULL,
      id_tipomo TEXT DEFAULT 'FA', vencim TEXT,
      importe_total REAL DEFAULT 0, tmp_importe REAL DEFAULT 0,
      pagado REAL DEFAULT 0, tmp_pagado REAL DEFAULT 0,
      marca TEXT DEFAULT ' ', separado INTEGER DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'P'
    );
    CREATE TABLE IF NOT EXISTS abono_cuota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cuota INTEGER, num_docu TEXT,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      valor REAL NOT NULL DEFAULT 0, concepto TEXT
    );
    CREATE TABLE IF NOT EXISTS pagos_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_instructor INTEGER NOT NULL, id_especialidad INTEGER,
      fecha_pag TEXT NOT NULL DEFAULT (date('now')),
      periodo_ini TEXT, periodo_fin TEXT,
      valor REAL NOT NULL DEFAULT 0, observaciones TEXT
    );
  `;

  // Ejecutar cada sentencia
  for (const stmt of sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0)) {
    db.prepare(stmt + ";").run();
  }
}

// =============================================
// FUNCIONES DE MIGRACIÓN POR TABLA
// =============================================
function migracionFactory(accdb, sqlite, stats) {
  function getTable(nombre) {
    try {
      return accdb.getTable(nombre).getData();
    } catch {
      return [];
    }
  }

  function initStats(tabla) {
    stats[tabla] = { ok: 0, errors: 0 };
  }

  function incOk(tabla) { stats[tabla].ok++; }
  function incErr(tabla, msg) {
    stats[tabla].errors++;
    logError(tabla, msg);
  }

  return {
    // ---- PARAMETROS ----
    parametros() {
      initStats("parametros");
      log("Migrando: Parametros...");
      const rows = getTable("Parametros");
      if (rows.length === 0) {
        sqlite.prepare(`INSERT INTO parametros (nombre_gimnasio, conse_ins, conse_rec, conse_fac, dias_inactivar, dias_alerta_vencimiento) VALUES ('MI GIMNASIO', 1, 1, 1, 90, 5)`).run();
        incOk("parametros");
        return;
      }
      const r = rows[0];
      try {
        sqlite.prepare(`
          INSERT INTO parametros (nombre_gimnasio, nit, direccion, telefono,
            conse_ins, conse_rec, conse_fac, dias_inactivar, dias_alerta_vencimiento)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          toStr(r.Nomb_emp) || "MI GIMNASIO",
          toStr(r.Rut),
          toStr(r.Direcc_emp),
          toStr(r.Telefo_emp),
          toInt(r.Conse_ins) || 1,
          toInt(r.Conse_rec) || 1,
          toInt(r.Conse_fac) || 1,
          toInt(r.DiasInactiva) || 90,
          5
        );
        incOk("parametros");
      } catch (e) {
        incErr("parametros", e.message);
      }
    },

    // ---- ESPECIALIDADES ----
    especialidades() {
      initStats("especialidades");
      log("Migrando: Especialidades...");
      const rows = getTable("Especialidades");
      const insert = sqlite.prepare(`INSERT OR IGNORE INTO especialidades (id, nombre) VALUES (?, ?)`);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(toInt(r.IdEspecialidad), toStr(r.detalle) || "Sin nombre");
            incOk("especialidades");
          } catch (e) { incErr("especialidades", e.message); }
        }
      });
      insertMany(rows);
      // Semilla si vacía
      if (rows.length === 0) {
        sqlite.prepare(`INSERT INTO especialidades (nombre) VALUES ('General')`).run();
        incOk("especialidades");
      }
    },

    // ---- FORMA DE PAGO ----
    formaDePago() {
      initStats("forma_pago");
      log("Migrando: FormaDePago...");
      const rows = getTable("FormaDePago");
      if (rows.length === 0) {
        const semilla = [["Efectivo", 0], ["Tarjeta", 0], ["Transferencia", 0], ["Crédito 30 días", 30]];
        for (const [d, p] of semilla) {
          sqlite.prepare(`INSERT INTO forma_pago (detalle, plazo_dias) VALUES (?, ?)`).run(d, p);
          incOk("forma_pago");
        }
        return;
      }
      const insert = sqlite.prepare(`INSERT OR IGNORE INTO forma_pago (id, detalle, plazo_dias) VALUES (?, ?, ?)`);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(toInt(r.IdFormaPago), toStr(r.detalle) || "Sin nombre", toInt(r.plazoDias));
            incOk("forma_pago");
          } catch (e) { incErr("forma_pago", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- PROVEEDORES ----
    proveedores() {
      initStats("proveedores");
      log("Migrando: Proveedores...");
      const rows = getTable("Proveedores");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO proveedores (nit, nombre, direccion, telefono, ciudad, email)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const nit = toStr(r.cedula) || `PROV-${Date.now()}-${Math.random()}`;
            insert.run(
              nit,
              `${toStr(r.nombres) || ""} ${toStr(r.apellidos) || ""}`.trim() || "Proveedor",
              toStr(r.direccion),
              toStr(r.telefono),
              toStr(r.ciudad),
              toStr(r.email)
            );
            incOk("proveedores");
          } catch (e) { incErr("proveedores", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- INSTRUCTORES ----
    instructores() {
      initStats("instructores");
      log("Migrando: Instructor...");
      const rows = getTable("Instructor");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO instructores (cedula, nombres, apellidos, direccion, telefono, email, id_especialidad, tarifa)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const cedula = toStr(r.cedula) || `INS-${Date.now()}-${Math.random()}`;
            insert.run(
              cedula,
              toStr(r.nombres) || "Instructor",
              toStr(r.apellidos) || "",
              toStr(r.direccion),
              toStr(r.telefono),
              toStr(r.email),
              r.IdEspecialidad ? toInt(r.IdEspecialidad) : null
            );
            incOk("instructores");
          } catch (e) { incErr("instructores", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- ACTIVIDADES ----
    actividades() {
      initStats("actividades");
      log("Migrando: Actividades...");
      const rows = getTable("Actividades");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO actividades (codigo, nombre, tarifa, factor, periodicidad, impuesto)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toStr(r.Idactividad) || `ACT-${Date.now()}`,
              toStr(r.detalle) || "Actividad",
              toNum(r.tarifa),
              toInt(r.factor) || 30,
              toStr(r.peridiocidad) === "U" ? "U" : "M",
              toNum(r.impuesto)
            );
            incOk("actividades");
          } catch (e) { incErr("actividades", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- CLIENTES ----
    clientes() {
      initStats("clientes");
      log("Migrando: Clientes (puede tomar un momento por las fotos)...");
      const rows = getTable("Clientes");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO clientes
          (inscripcion, cedula, nombres, apellidos, direccion, telefono,
           celular, email, ciudad, sexo, fecha_inscripcion, fecha_nacimiento,
           estado, foto_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let fotosGuardadas = 0;
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const inscripcion = toInt(r.inscripcion);
            let fotoPath = null;
            if (r.foto) {
              fotoPath = guardarFoto(r.foto, inscripcion);
              if (fotoPath) fotosGuardadas++;
            }
            const estado = toStr(r.Estado);
            insert.run(
              inscripcion,
              toStr(r.cedula) || `CLI-${inscripcion}`,
              toStr(r.nombres) || "Sin Nombre",
              toStr(r.apellidos) || "",
              toStr(r.direccion),
              toStr(r.telefono),
              toStr(r.celular),
              toStr(r.email),
              toStr(r.ciudad) || "PALMIRA",
              toStr(r.sexo),
              toDate(r.fecinsc),
              toDate(r.fecnaci),
              (estado === "A" || estado === "I") ? estado : "A",
              fotoPath
            );
            incOk("clientes");
          } catch (e) { incErr("clientes", `cedula=${r.cedula}: ${e.message}`); }
        }
      });
      insertMany(rows);
      log(`  → ${fotosGuardadas} fotos extraídas y guardadas en ${FOTOS_DIR}`);
    },

    // ---- MEDIDAS ----
    medidas() {
      initStats("medidas");
      log("Migrando: Medidas...");
      const rows = getTable("Medidas");
      const insert = sqlite.prepare(`
        INSERT INTO medidas (inscripcion, fecha, peso, talla, cintura, brazos, muslos, pantorrilla, torax, cadera, estatura)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toInt(r.Inscripcion),
              toDate(r.Fecham) || new Date().toISOString().split("T")[0],
              toNum(r.txtMed1),  // peso (kg)
              null,              // talla corporal — no existe campo directo en Access (txtMed2 es talla de ropa)
              toNum(r.txtMed3),  // cintura (cm)
              toNum(r.txtMed4),  // brazos (cm)
              toNum(r.txtMed5),  // muslos (cm)
              toNum(r.txtMed6),  // pantorrilla (cm)
              toNum(r.txtMed7),  // torax (cm)
              toNum(r.txtMed8),  // cadera (cm)
              toNum(r.txtMed9)   // estatura (cm o metros segun registro — datos mixtos del sistema original)
            );
            incOk("medidas");
          } catch (e) { incErr("medidas", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- INVENTARIO ----
    inventario() {
      initStats("inventario");
      log("Migrando: Inventario...");
      const rows = getTable("Inventario");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO inventario (codigo, nombre, stock, unidad_medida, precio_compra, ganancia, impuesto, ubicacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toStr(r.codigo) || `ART-${Date.now()}`,
              toStr(r.nombre) || "Artículo",
              toNum(r.stock),
              toStr(r.unmed) || "UND",
              toNum(r.pCompra),
              toNum(r.ganancia),
              toNum(r.impuesto),
              toStr(r.CodUb)
            );
            incOk("inventario");
          } catch (e) { incErr("inventario", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- USUARIOS ----
    usuarios() {
      initStats("usuarios");
      log("Migrando: Usuario...");
      const rows = getTable("Usuario");
      // Para usuarios migrados usamos su password original (ya cifrado con la función VB6)
      // Se establece como hash bcrypt de 'sagim123' para todos, el admin puede cambiarlas
      const DEFAULT_HASH = "$2b$10$HHSTs3XNrBdL1LCMR8dDye07Vv1PV3d69vRvHuvrOi7agPoEjiobq";
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO usuarios (nombre, password_hash, cargo, nivel)
        VALUES (?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const nivel = toInt(r.nivel) === 1 ? 1 : 2;
            insert.run(
              toStr(r.nombre) || "usuario",
              DEFAULT_HASH,
              toStr(r.cargo) || "",
              nivel
            );
            incOk("usuarios");
          } catch (e) { incErr("usuarios", e.message); }
        }
      });
      insertMany(rows);
      // Asegurar que existe el admin
      const adminExists = sqlite.prepare("SELECT id FROM usuarios WHERE nombre='admin'").get();
      if (!adminExists) {
        sqlite.prepare(`INSERT INTO usuarios (nombre, password_hash, cargo, nivel) VALUES ('admin', ?, 'Administrador', 1)`).run(DEFAULT_HASH);
        incOk("usuarios");
      }
    },

    // ---- PAGOS_CLI ----
    pagosCli() {
      initStats("pagos_cli");
      log("Migrando: PagosCli...");
      const rows = getTable("PagosCli");
      const insert = sqlite.prepare(`
        INSERT INTO pagos_cli (inscripcion, fecha_pag, id_actividad, valor, periodicidad, observaciones, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const estado = toStr(r.Estado);
            insert.run(
              toInt(r.Inscripcion),
              toDate(r.FechaPag) || new Date().toISOString().split("T")[0],
              toStr(r.Idactividad),
              toNum(r.Valor),
              toStr(r.Periodicidad) === "U" ? "U" : "M",
              toStr(r.Observaciones),
              (estado === "X") ? "X" : "A"
            );
            incOk("pagos_cli");
          } catch (e) { incErr("pagos_cli", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- RECIBOS ----
    recibos() {
      initStats("recibos");
      log("Migrando: ReciboPago...");
      const rows = getTable("ReciboPago");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO recibos (nro_docu, fecha, hora, cedula, valor_letras, estado, fecha_anulacion, hora_anulacion, usuario_anulacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const estado = toStr(r.Estado);
            insert.run(
              toInt(r.nroDocu),
              toDate(r.fecha) || new Date().toISOString().split("T")[0],
              toStr(r.Horcre),
              toStr(r.cCedula),
              toStr(r.Valorletras),
              (estado === "X") ? "X" : "A",
              toDate(r.Fecnov),
              toStr(r.Hornov),
              toStr(r.Usuario)
            );
            incOk("recibos");
          } catch (e) { incErr("recibos", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- DET_RECIBO_PAGO ----
    detReciboPago() {
      initStats("det_recibo_pago");
      log("Migrando: detReciboPago...");
      const rows = getTable("detReciboPago");
      const insert = sqlite.prepare(`
        INSERT INTO det_recibo_pago (nro_docu, codigo, detalle, cantidad, punitario, descuento, impuesto, total, unmed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toInt(r.nroDocu),
              toStr(r.codigo) || "",
              toStr(r.detalle),
              toNum(r.cantidad) || 1,
              toNum(r.pUnitario),
              toNum(r.descuento),
              toNum(r.impuesto),
              toNum(r.total),
              toStr(r.unmed) || "SRV"
            );
            incOk("det_recibo_pago");
          } catch (e) { incErr("det_recibo_pago", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- FACTU_TIENDA ----
    FactuTienda() {
      initStats("factu_tienda");
      log("Migrando: FactuTienda...");
      const rows = getTable("FactuTienda");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO factu_tienda (nro_docu, fecha, hora, cedula, id_forma_pago, plazo, estado, fecha_anulacion, hora_anulacion, usuario_anulacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const estado = toStr(r.Estado);
            insert.run(
              toInt(r.nroDocu),
              toDate(r.fecha) || new Date().toISOString().split("T")[0],
              null,
              toStr(r.cCedula),
              r.IdFormaPago ? toInt(r.IdFormaPago) : null,
              toInt(r.Plazo),
              (estado === "X") ? "X" : "A",
              toDate(r.Fecnov),
              toStr(r.Hornov),
              toStr(r.Usuario)
            );
            incOk("factu_tienda");
          } catch (e) { incErr("factu_tienda", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- DET_FACTU_TIENDA ----
    detFactuTienda() {
      initStats("det_factu_tienda");
      log("Migrando: detFactuTienda...");
      const rows = getTable("detFactuTienda");
      const insert = sqlite.prepare(`
        INSERT INTO det_factu_tienda (nro_docu, codigo, detalle, cantidad, punitario, descuento, impuesto, total, unmed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toInt(r.nroDocu),
              toStr(r.codigo) || "",
              toStr(r.detalle),
              toNum(r.cantidad) || 1,
              toNum(r.pUnitario),
              toNum(r.descuento),
              toNum(r.impuesto),
              toNum(r.total),
              toStr(r.unmed) || "UND"
            );
            incOk("det_factu_tienda");
          } catch (e) { incErr("det_factu_tienda", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- COMPRAS ----
    compras() {
      initStats("compras");
      log("Migrando: Compra...");
      const rows = getTable("Compra");
      const insert = sqlite.prepare(`
        INSERT OR IGNORE INTO compras (nro_compra, fecha, nro_documento, estado)
        VALUES (?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toInt(r.nroCompra),
              toDate(r.fecha) || new Date().toISOString().split("T")[0],
              toStr(r.referencia),
              toStr(r.Estado) === "X" ? "X" : "A"
            );
            incOk("compras");
          } catch (e) { incErr("compras", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- DET_COMPRA ----
    detCompra() {
      initStats("det_compra");
      log("Migrando: detCompra...");
      const rows = getTable("detCompra");
      const insert = sqlite.prepare(`
        INSERT INTO det_compra (nro_compra, codigo, detalle, cantidad, punitario, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toInt(r.nroCompra),
              toStr(r.codigo) || "",
              toStr(r.detalle),
              toNum(r.cantidad) || 1,
              toNum(r.pCompra),
              toNum(r.total)
            );
            incOk("det_compra");
          } catch (e) { incErr("det_compra", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- MOV_CAJA ----
    movCaja() {
      initStats("mov_caja");
      log("Migrando: MovCaja...");
      const rows = getTable("MovCaja");
      const insert = sqlite.prepare(`
        INSERT INTO mov_caja (referencia, fecha, cedula, concepto, natural, valor, val_ingre, val_egre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const natural = toStr(r.Natural);
            insert.run(
              toStr(r.Referencia),
              toDate(r.Fecha) || new Date().toISOString().split("T")[0],
              toStr(r.Cedula),
              toStr(r.Concepto),
              (natural === "E") ? "E" : "I",
              toNum(r.Valor),
              toNum(r.Valingre),
              toNum(r.Valegre)
            );
            incOk("mov_caja");
          } catch (e) { incErr("mov_caja", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- CTAS_POR_COBRAR ----
    ctasPorCobrar() {
      initStats("ctas_por_cobrar");
      log("Migrando: CtasPorCobrar...");
      const rows = getTable("CtasPorCobrar");
      const insert = sqlite.prepare(`
        INSERT INTO ctas_por_cobrar (num_mov, id_cliente, num_docu, id_tipomo, fecha_doc, fecha_ven, concemo, importe, pago_clien, diferencia, saldo_clien, separado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const validTipos = new Set(["IN", "AB", "NC", "ND", "FA", "AN"]);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const tipo = toStr(r.Idtipomo) || "AB";
            insert.run(
              toInt(r.NumMov),
              toStr(r.IdCliente) || "",
              toStr(r.Numdocu),
              validTipos.has(tipo) ? tipo : "AB",
              toDate(r.Fechadoc) || new Date().toISOString().split("T")[0],
              toDate(r.Fechaven),
              toStr(r.Concemo),
              toNum(r.Importe),
              toNum(r.Pagoclien),
              toNum(r.Diferencia),
              toNum(r.Saldoclien),
              toInt(r.Separado)
            );
            incOk("ctas_por_cobrar");
          } catch (e) { incErr("ctas_por_cobrar", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- CTAS_POR_PAGAR ----
    ctasPorPagar() {
      initStats("ctas_por_pagar");
      log("Migrando: CtasPorPagar...");
      const rows = getTable("CtasPorPagar");
      const insert = sqlite.prepare(`
        INSERT INTO ctas_por_pagar (fecha_doc, fecha_ven, importe, pagado, saldo, estado)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const saldo = toNum(r.valor) - toNum(r.abono);
            insert.run(
              new Date().toISOString().split("T")[0],
              toDate(r.fechaVenc),
              toNum(r.valor),
              toNum(r.abono),
              saldo,
              saldo <= 0 ? "C" : "P"
            );
            incOk("ctas_por_pagar");
          } catch (e) { incErr("ctas_por_pagar", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- CUOTAS_CLI ----
    cuotasCli() {
      initStats("cuotas_cli");
      log("Migrando: CuotasCli...");
      const rows = getTable("CuotasCli");
      const insert = sqlite.prepare(`
        INSERT INTO cuotas_cli (id_cliente, num_doc, nro_cuota, id_tipomo, vencim, importe_total, tmp_importe, pagado, tmp_pagado, marca, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const pagado = toNum(r.Pagado);
            const total = toNum(r.ImporteTotal);
            const estado = pagado >= total && total > 0 ? "C" : "P";
            insert.run(
              toStr(r.IdCliente) || "",
              toStr(r.NumDoc),
              toInt(r.NroCuota),
              toStr(r.Idtipomo) || "FA",
              toDate(r.Vencim),
              total,
              toNum(r.Tmp_Importe),
              pagado,
              toNum(r.Tmp_Pagado),
              toStr(r.Marca) || " ",
              estado
            );
            incOk("cuotas_cli");
          } catch (e) { incErr("cuotas_cli", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- ABONO_CUOTA ----
    abonoCuota() {
      initStats("abono_cuota");
      log("Migrando: AbonoCuota...");
      const rows = getTable("AbonoCuota");
      const insert = sqlite.prepare(`
        INSERT INTO abono_cuota (num_docu, fecha, valor, concepto)
        VALUES (?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            insert.run(
              toStr(r.Numdocu),
              new Date().toISOString().split("T")[0],
              toNum(r.Importe),
              `Abono cuota ${r.NroCuota || ""}`
            );
            incOk("abono_cuota");
          } catch (e) { incErr("abono_cuota", e.message); }
        }
      });
      insertMany(rows);
    },

    // ---- PAGOS_INS ----
    pagosIns() {
      initStats("pagos_ins");
      log("Migrando: PagosIns...");
      const rows = getTable("PagosIns");
      // Necesitamos mapear cedula del instructor a su id
      const instMap = {};
      try {
        const instRows = sqlite.prepare("SELECT id, cedula FROM instructores").all();
        for (const inst of instRows) instMap[inst.cedula] = inst.id;
      } catch {}

      const insert = sqlite.prepare(`
        INSERT INTO pagos_ins (id_instructor, id_especialidad, fecha_pag, valor, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertMany = sqlite.transaction((data) => {
        for (const r of data) {
          try {
            const cedula = toStr(r.Cedula);
            const idInstructor = cedula ? (instMap[cedula] || 1) : 1;
            insert.run(
              idInstructor,
              r.Idespecialidad ? toInt(r.Idespecialidad) : null,
              toDate(r.FechaPag) || new Date().toISOString().split("T")[0],
              toNum(r.ValorTot),
              toStr(r.Observaciones)
            );
            incOk("pagos_ins");
          } catch (e) { incErr("pagos_ins", e.message); }
        }
      });
      insertMany(rows);
    },
  };
}

// =============================================
// EJECUTAR
// =============================================
main().catch((err) => {
  console.error("\n[FATAL]", err.message);
  console.error(err.stack);
  process.exit(1);
});
