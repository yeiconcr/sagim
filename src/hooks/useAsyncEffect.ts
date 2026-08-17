/**
 * useAsyncEffect — Hook para manejar efectos asíncronos con cleanup automático.
 * Previene actualizaciones de estado en componentes desmontados.
 */
import { useEffect, useRef, useCallback, DependencyList } from "react";

/**
 * Hook que ejecuta una función async con cleanup automático.
 * El callback recibe una función `isMounted` que retorna false si el componente
 * se desmontó, permitiendo cancelar actualizaciones de estado.
 * 
 * @example
 * useAsyncEffect(async (isMounted) => {
 *   const data = await fetchData();
 *   if (isMounted()) {
 *     setData(data);
 *   }
 * }, [dependency]);
 */
export function useAsyncEffect(
  effect: (isMounted: () => boolean) => Promise<void>,
  deps: DependencyList
) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    effect(() => mountedRef.current);
    
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook que retorna una función para verificar si el componente está montado.
 * Útil para callbacks async que no están en useEffect.
 * 
 * @example
 * const isMounted = useIsMounted();
 * 
 * const handleClick = async () => {
 *   const data = await fetchData();
 *   if (isMounted()) {
 *     setData(data);
 *   }
 * };
 */
export function useIsMounted() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
