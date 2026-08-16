// Re-exportaciones centralizadas de la capa de datos SAGIM

// Core
export { initDatabase, getDb, closeDatabase } from "./database";
export { useQuery, dbSelect, dbSelectOne, dbExecute, dbTransaction, getNextConsecutivo } from "./useDb";

// Tipos
export * from "./types";

// Queries por módulo
export * from "./queries/clientes";
export * from "./queries/catalogos";
export * from "./queries/inventario";
export * from "./queries/ventas";
export * from "./queries/compras";
export * from "./queries/caja";
export * from "./queries/pagosIns";
export * from "./queries/configuracion";
