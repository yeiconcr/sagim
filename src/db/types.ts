/**
 * Tipos TypeScript para todas las tablas de la BD SAGIM.
 * Corresponden 1:1 con las tablas SQLite definidas en database.ts
 */

// =============================================
// USUARIOS
// =============================================
export interface Usuario {
  id: number;
  nombre: string;
  password_hash: string;
  cargo: string | null;
  nivel: 1 | 2; // 1=Admin, 2=Operador
  estado: "A" | "I";
  fecha_creacion: string;
  creado_por: string | null;
}

export interface UsuarioForm {
  nombre: string;
  password: string;
  cargo: string;
  nivel: 1 | 2;
}

// =============================================
// PARAMETROS
// =============================================
export interface Parametros {
  id: number;
  nombre_gimnasio: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_path: string | null;
  conse_ins: number;
  conse_rec: number;
  conse_fac: number;
  dias_inactivar: number;
  dias_alerta_vencimiento: number;
}

// =============================================
// ESPECIALIDADES
// =============================================
export interface Especialidad {
  id: number;
  nombre: string;
  estado: "A" | "I";
}

// =============================================
// ACTIVIDADES
// =============================================
export interface Actividad {
  id: number;
  codigo: string;
  nombre: string;
  tarifa: number;
  factor: number; // días de duración de membresía
  periodicidad: "M" | "U"; // M=mensual, U=única vez
  impuesto: number;
  estado: "A" | "I";
}

// =============================================
// FORMA DE PAGO
// =============================================
export interface FormaPago {
  id: number;
  detalle: string;
  plazo_dias: number;
  estado: "A" | "I";
}

// =============================================
// PROVEEDORES
// =============================================
export interface Proveedor {
  id: number;
  nit: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  contacto: string | null;
  email: string | null;
  estado: "A" | "I";
}

// =============================================
// INSTRUCTORES
// =============================================
export interface Instructor {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  direccion: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  id_especialidad: number | null;
  tarifa: number;
  estado: "A" | "I";
  // join
  nombre_especialidad?: string;
}

// =============================================
// CLIENTES
// =============================================
export interface Cliente {
  id: number;
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  direccion: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  ciudad: string | null;
  sexo: "1" | "2" | null; // 1=Masculino, 2=Femenino
  fecha_inscripcion: string | null;
  fecha_nacimiento: string | null;
  estado: "A" | "I";
  foto_path: string | null;
  fecha_creacion: string;
  // campos calculados (joins / lógica de negocio)
  nombre_completo?: string;
  edad?: number;
  proximo_vencimiento?: string | null;
  actividad_vigente?: string | null;
}

// =============================================
// MEDIDAS
// =============================================
export interface Medida {
  id: number;
  inscripcion: number;
  fecha: string;
  peso: number | null;
  talla: number | null;
  cintura: number | null;
  brazos: number | null;
  muslos: number | null;
  pantorrilla: number | null;
  torax: number | null;
  cadera: number | null;
  estatura: number | null;
}

// =============================================
// INVENTARIO
// =============================================
export interface Inventario {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  stock: number;
  unidad_medida: string;
  precio_compra: number;
  ganancia: number;
  impuesto: number;
  ubicacion: string | null;
  id_proveedor: number | null;
  estado: "A" | "I";
  // calculado
  precio_venta?: number;
  nombre_proveedor?: string;
}

// =============================================
// KARDEX
// =============================================
export interface Kardex {
  id: number;
  codigo_art: string;
  fecha: string;
  detalle: string | null;
  cantidad_in: number;
  punitario_in: number;
  total_in: number;
  cantidad_sa: number;
  punitario_sa: number;
  total_sa: number;
  // calculado
  saldo?: number;
}

// =============================================
// RECIBOS (Ventas Gym - cabecera)
// =============================================
export interface Recibo {
  id: number;
  nro_docu: number;
  fecha: string;
  hora: string | null;
  cedula: string | null;
  inscripcion: number | null;
  observaciones: string | null;
  valor_letras: string | null;
  estado: "A" | "X"; // A=activo, X=anulado
  fecha_anulacion: string | null;
  hora_anulacion: string | null;
  usuario_anulacion: string | null;
  // joins
  nombre_cliente?: string;
  total?: number;
}

// =============================================
// DET_RECIBO_PAGO (Ventas Gym - detalle)
// =============================================
export interface DetReciboPago {
  id: number;
  nro_docu: number;
  codigo: string;
  detalle: string | null;
  cantidad: number;
  punitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  unmed: string;
}

// =============================================
// PAGOS_CLI (registro histórico de pagos por actividad)
// =============================================
export interface PagoCli {
  id: number;
  inscripcion: number;
  fecha_pag: string;
  id_actividad: string | null;
  valor: number;
  periodicidad: "M" | "U";
  observaciones: string | null;
  estado: "A" | "X";
  nro_recibo: number | null;
  // joins
  nombre_actividad?: string;
  factor?: number;
}

// =============================================
// FACTU_TIENDA (Ventas Tienda - cabecera)
// =============================================
export interface FactuTienda {
  id: number;
  nro_docu: number;
  fecha: string;
  hora: string | null;
  cedula: string | null;
  id_forma_pago: number | null;
  plazo: number;
  subtotal: number;
  iva: number;
  total: number;
  valor_letras: string | null;
  estado: "A" | "X";
  fecha_anulacion: string | null;
  hora_anulacion: string | null;
  usuario_anulacion: string | null;
  // joins
  nombre_cliente?: string;
  nombre_forma_pago?: string;
}

// =============================================
// DET_FACTU_TIENDA (Ventas Tienda - detalle)
// =============================================
export interface DetFactuTienda {
  id: number;
  nro_docu: number;
  codigo: string;
  detalle: string | null;
  cantidad: number;
  punitario: number;
  descuento: number;
  impuesto: number;
  total: number;
  unmed: string;
}

// =============================================
// COMPRAS (cabecera)
// =============================================
export interface Compra {
  id: number;
  nro_compra: number;
  fecha: string;
  id_proveedor: number | null;
  nro_documento: string | null;
  total: number;
  id_forma_pago: number | null;
  plazo: number;
  observaciones: string | null;
  estado: "A" | "X";
  // joins
  nombre_proveedor?: string;
  nombre_forma_pago?: string;
}

// =============================================
// DET_COMPRA (detalle)
// =============================================
export interface DetCompra {
  id: number;
  nro_compra: number;
  codigo: string;
  detalle: string | null;
  cantidad: number;
  punitario: number;
  total: number;
}

// =============================================
// MOV_CAJA
// =============================================
export interface MovCaja {
  id: number;
  referencia: string | null;
  fecha: string;
  cedula: string | null;
  concepto: string | null;
  natural: "I" | "E"; // I=ingreso, E=egreso
  valor: number;
  val_ingre: number;
  val_egre: number;
  usuario: string | null;
}

// =============================================
// CTAS_POR_COBRAR
// =============================================
export type TipoMovCxC = "IN" | "AB" | "NC" | "ND" | "FA" | "AN";

export interface CtaPorCobrar {
  id: number;
  num_mov: number;
  id_cliente: string;
  num_docu: string | null;
  id_tipomo: TipoMovCxC;
  fecha_doc: string;
  fecha_ven: string | null;
  concemo: string | null;
  importe: number;
  pago_clien: number;
  diferencia: number;
  saldo_clien: number;
  separado: number;
  // joins
  nombre_cliente?: string;
}

// =============================================
// CTAS_POR_PAGAR
// =============================================
export interface CtaPorPagar {
  id: number;
  nro_compra: number | null;
  id_proveedor: number | null;
  fecha_doc: string;
  fecha_ven: string | null;
  importe: number;
  pagado: number;
  saldo: number;
  estado: "P" | "C"; // P=pendiente, C=cancelada
  // joins
  nombre_proveedor?: string;
}

// =============================================
// CUOTAS_CLI
// =============================================
export interface CuotaCli {
  id: number;
  id_cliente: string;
  num_doc: string | null;
  nro_cuota: number;
  id_tipomo: string;
  vencim: string | null;
  importe_total: number;
  tmp_importe: number;
  pagado: number;
  tmp_pagado: number;
  marca: string;
  separado: number;
  estado: "P" | "C" | "V"; // P=pendiente, C=cancelada, V=vencida
}

// =============================================
// ABONO_CUOTA
// =============================================
export interface AbonoCuota {
  id: number;
  id_cuota: number | null;
  num_docu: string | null;
  fecha: string;
  valor: number;
  concepto: string | null;
}

// =============================================
// PAGOS_INS
// =============================================
export interface PagoIns {
  id: number;
  id_instructor: number;
  id_especialidad: number | null;
  fecha_pag: string;
  periodo_ini: string | null;
  periodo_fin: string | null;
  valor: number;
  observaciones: string | null;
  // joins
  nombre_instructor?: string;
  nombre_especialidad?: string;
}

// =============================================
// TIPOS DE RESÚMENES / VISTAS
// =============================================

export interface ResumenCaja {
  total_ingresos: number;
  total_egresos: number;
  saldo: number;
}

export interface ClienteVencimiento {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  actividad: string;
  fecha_vencimiento: string;
  dias_restantes: number;
}

export interface ClienteCumpleanos {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  fecha_nacimiento: string;
  edad: number;
}

export interface ClienteInactivo {
  inscripcion: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  ultimo_pago: string | null;
  dias_sin_pago: number;
}

// =============================================
// PAGINACIÓN
// =============================================
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: "A" | "I" | "X" | "todos";
  fechaDesde?: string;
  fechaHasta?: string;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}
