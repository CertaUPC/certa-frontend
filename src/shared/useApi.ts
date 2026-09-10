/* Carga de datos con cargando, error y vacío explícitos. Sin ellos, cuando algo
 * falla queda una pantalla en blanco.
 *
 * Con `USE_FIXTURES` devuelve los datos de muestra sin tocar la red.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, USE_FIXTURES } from "./api";

export interface Loadable<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "La sesión venció. Vuelve a entrar.";
    if (err.status === 403) return "Tu rol no permite esta operación.";
    if (err.status === 404) return "No se encontró lo que buscabas.";
    return err.message;
  }
  // Un fallo de red llega como TypeError; cualquier otro Error trae un mensaje
  // que alguien escribió a propósito y decirlo es más útil que sustituirlo.
  if (err instanceof Error && !(err instanceof TypeError)) return err.message;
  return (
    "No se pudo contactar al servicio. Comprueba que esté levantado en la " +
    "dirección configurada."
  );
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  fixture: T,
  deps: unknown[] = [],
): Loadable<T> {
  const [data, setData] = useState<T | null>(USE_FIXTURES ? fixture : null);
  const [loading, setLoading] = useState(!USE_FIXTURES);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Evita escribir estado sobre un componente ya desmontado, y descartar la
  // respuesta de una petición que quedó obsoleta al cambiar las dependencias.
  const vigente = useRef(0);

  useEffect(() => {
    if (USE_FIXTURES) {
      setData(fixture);
      setLoading(false);
      setError(null);
      return;
    }
    const marca = ++vigente.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((r) => {
        if (vigente.current === marca) setData(r);
      })
      .catch((e) => {
        if (vigente.current === marca) {
          setError(describe(e));
          setData(null);
        }
      })
      .finally(() => {
        if (vigente.current === marca) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Acción que el usuario dispara, con su estado de envío y su fallo. */
export function useAction<A extends unknown[], R>(
  action: (...args: A) => Promise<R>,
): {
  run: (...args: A) => Promise<R | null>;
  busy: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: A) => {
      setBusy(true);
      setError(null);
      try {
        return await action(...args);
      } catch (e) {
        setError(describe(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [action],
  );

  return { run, busy, error, clearError: () => setError(null) };
}
