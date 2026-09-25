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
  /** Declara que esta pantalla es del instrumento: vuelve al tema de partida
      y deja de recordar lo que se elija. */
  medir: () => void;
}

const Ctx = createContext<ThemeValue | null>(null);

const CLAVE = "certa.tema";

/* Con el que arranca todo el mundo. Dentro del estudio es además el que ve
   cada participante al llegar, pase lo que pase en la máquina antes. */
const DEFECTO: Theme = "dark";

function guardado(): Theme {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === "light" || v === "dark" ? v : DEFECTO;
  } catch {
    /* Ventana privada o almacenamiento bloqueado: arranca en oscuro. */
    return DEFECTO;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  /* Se recuerda entre visitas y no solo dentro de la pestaña: elegir claro y
     que la siguiente recarga lo devuelva a oscuro obligaba a volver a
     elegirlo cada vez. Va en el almacenamiento local y no en el de sesión
     porque es una preferencia de la persona, no de la sesión de trabajo. */
  const [theme, setTheme] = useState<Theme>(guardado);
  /* Dentro de una sesión medida no se recuerda nada: si el primer
     participante deja la pantalla en claro, el siguiente tiene que encontrar
     lo mismo que encontró el primero, o la presentación deja de ser la misma
     y la comparación entre condiciones se contamina. */
  const [medido, setMedido] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (medido) return;
    try {
      localStorage.setItem(CLAVE, theme);
    } catch {
      /* Sin almacenamiento la elección dura lo que dure la pestaña. */
    }
  }, [theme, medido]);

  const medir = useCallback(() => {
    setMedido(true);
    setTheme(DEFECTO);
  }, []);

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
      medir,
    }),
    [theme, locked, toggle, lock, unlock, medir],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme necesita estar dentro de ThemeProvider");
  return v;
}
