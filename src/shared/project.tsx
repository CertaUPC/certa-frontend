/* Qué proyecto está mirando el equipo ahora mismo.
 *
 * La navegación vertical ofrece las ejecuciones y las acciones del proyecto
 * seleccionado, de modo que esa selección es estado de la aplicación y no de
 * una pantalla. Vive aquí para que la barra y el contenido coincidan sin
 * pasársela de una a otra por la dirección.
 *
 * Se recuerda en el almacenamiento de sesión y no en el local: la sesión del
 * equipo dura ocho horas en este navegador, y dejar el proyecto elegido más
 * allá de eso sería recordar algo de una sesión que ya cerró.
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
import { api, type Project } from "./api";

const CLAVE = "certa.proyecto";

interface Estado {
  proyectos: Project[];
  actual: Project | null;
  elegir: (id: string) => void;
  recargar: () => void;
  cargando: boolean;
}

const Contexto = createContext<Estado>({
  proyectos: [],
  actual: null,
  elegir: () => {},
  recargar: () => {},
  cargando: true,
});

function recordado(): string | null {
  try {
    return sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos] = useState<Project[]>([]);
  const [elegido, setElegido] = useState<string | null>(recordado);
  const [cargando, setCargando] = useState(true);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true;
    api
      .projects()
      .then((p) => {
        if (!vigente) return;
        setProyectos(p);
        setCargando(false);
      })
      .catch(() => {
        /* La barra es orientación, no la tarea. Sin proyectos se pinta vacía
           y el resto de la aplicación sigue funcionando. */
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [vuelta]);

  const elegir = useCallback((id: string) => {
    setElegido(id);
    try {
      sessionStorage.setItem(CLAVE, id);
    } catch {
      /* Sin almacenamiento la elección dura lo que dure la pestaña. */
    }
  }, []);

  const actual = useMemo(
    () => proyectos.find((p) => p.id === elegido) ?? proyectos[0] ?? null,
    [proyectos, elegido],
  );

  const valor = useMemo(
    () => ({
      proyectos,
      actual,
      elegir,
      recargar: () => setVuelta((n) => n + 1),
      cargando,
    }),
    [proyectos, actual, elegir, cargando],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useProyecto() {
  return useContext(Contexto);
}
