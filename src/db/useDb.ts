/**
 * Hook useDb — acceso reactivo a la base de datos SQLite.
 * Envuelve las queries con manejo de estado (loading/error/data).
 */

import { useState, useEffect, useCallback } from 'react';
import { getDb } from './database';

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
export function useQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
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
          console.error('[useQuery] Error:', err);
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
 * Ejecuta múltiples queries dentro de una transacción SQLite real.
 * Si cualquier operación falla, hace ROLLBACK completo garantizando
 * consistencia de datos (atomicidad).
 *
 * Serializa llamadas concurrentes con una cola para evitar que dos
 * transacciones simultáneas generen "database is locked" (SQLITE_BUSY).
 *
 * IMPORTANTE: la cola siempre avanza aunque una transacción falle,
 * usando .catch(() => {}) sobre el slot de la cola — el error se
 * propaga al llamador por la promesa individual, no por la cola.
 */
let _txQueue: Promise<void> = Promise.resolve();

export function dbTransaction(
  operations: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  // Crear la promesa de esta transacción encadenada detrás de la cola actual.
  const txPromise = _txQueue.then(() => _runTransaction(operations));

  // Avanzar la cola ignorando el resultado (éxito o error) de esta transacción,
  // para que la siguiente en la cola siempre pueda ejecutarse.
  _txQueue = txPromise.catch(() => {});

  // Retornar la promesa real al llamador para que reciba el error si lo hay.
  return txPromise;
}

async function _runTransaction(
  operations: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  const db = await getDb();
  await db.execute('BEGIN TRANSACTION');
  try {
    for (const op of operations) {
      await db.execute(op.sql, op.params ?? []);
    }
    await db.execute('COMMIT');
  } catch (err) {
    try {
      await db.execute('ROLLBACK');
    } catch {
      // Ignorar error de ROLLBACK si la conexión ya estaba limpia
    }
    throw err;
  }
}

/**
 * Obtiene el siguiente consecutivo y lo incrementa de forma atómica.
 * Usa UPDATE ... RETURNING para leer y escribir en una sola operación,
 * evitando race conditions si dos procesos llaman esto simultáneamente.
 * Usar para conse_ins, conse_rec, conse_fac.
 */
export async function getNextConsecutivo(
  campo: 'conse_ins' | 'conse_rec' | 'conse_fac'
): Promise<number> {
  const db = await getDb();
  // UPDATE RETURNING es atómico en SQLite 3.35+
  // Incrementa y retorna el valor ANTES del incremento en una sola operación
  const rows = await db.select<[{ val: number }]>(
    `UPDATE parametros SET ${campo} = ${campo} + 1 WHERE id = 1 RETURNING ${campo} - 1 as val`
  );
  if (!rows[0]) throw new Error(`No se encontró registro en parametros para campo ${campo}`);
  return rows[0].val;
}
