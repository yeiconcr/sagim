/**
 * Hook useDb — acceso reactivo a la base de datos SQLite.
 * Envuelve las queries con manejo de estado (loading/error/data).
 */

import { useState, useEffect, useCallback } from "react";
import { getDb } from "./database";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para ejecutar una query SELECT y obtener resultados reactivos.
 * Se re-ejecuta automáticamente cuando cambian las dependencias.
 */
export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    queryFn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[useQuery] Error:", err);
          setError(String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, trigger]);

  return { data, loading, error, refetch };
}

/**
 * Ejecuta una query SELECT directamente (sin estado reactivo).
 * Útil en handlers de eventos.
 */
export async function dbSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

/**
 * Versión que retorna el primer resultado o null (evita acceso a índice 0 con TypeScript).
 */
export async function dbSelectOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = await getDb();
  const rows = await db.select<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Ejecuta una query INSERT/UPDATE/DELETE.
 * Retorna el rowsAffected y lastInsertId.
 */
export async function dbExecute(
  sql: string,
  params: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const db = await getDb();
  const result = await db.execute(sql, params);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId as number,
  };
}

/**
 * Ejecuta múltiples queries en secuencia.
 * NOTA: tauri-plugin-sql usa un pool de conexiones en Rust.
 * Ejecutar BEGIN TRANSACTION manual puede causar "database is locked"
 * si el pool asigna una conexión distinta para el siguiente execute.
 * Por lo tanto, ejecutamos secuencialmente con auto-commit.
 */
export async function dbTransaction(
  operations: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  const db = await getDb();
  for (const op of operations) {
    await db.execute(op.sql, op.params ?? []);
  }
}

/**
 * Obtiene el siguiente consecutivo y lo incrementa (atómico).
 * Usar para conse_ins, conse_rec, conse_fac.
 */
export async function getNextConsecutivo(
  campo: "conse_ins" | "conse_rec" | "conse_fac"
): Promise<number> {
  const db = await getDb();
  const rows = await db.select<[{ val: number }]>(
    `SELECT ${campo} as val FROM parametros LIMIT 1`
  );
  const current = rows[0]?.val ?? 1;
  await db.execute(`UPDATE parametros SET ${campo} = ${campo} + 1`);
  return current;
}
