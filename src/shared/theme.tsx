/* Arranca en oscuro. Durante una sesión queda fijado: cambiarlo a mitad de
 * camino rompería que la presentación sea idéntica entre las dos condiciones.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeValue {
  theme: Theme;
  locked: boolean;
  toggle: () => void;
  lock: () => void;
  unlock: () => void;
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    if (locked) return;
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, [locked]);

  /* Estables a propósito: el efecto que fija el tema al iniciar la sesión
     depende de ellas, y una identidad nueva en cada render lo reejecutaría. */
  const lock = useCallback(() => setLocked(true), []);
  const unlock = useCallback(() => setLocked(false), []);

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      locked,
      toggle,
      lock,
      unlock,
    }),
    [theme, locked, toggle, lock, unlock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme necesita estar dentro de ThemeProvider");
  return v;
}
