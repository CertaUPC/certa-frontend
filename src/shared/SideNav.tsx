/* La navegación del equipo, en vertical.
 *
 * Era una barra horizontal con tres enlaces. En horizontal no cabe nada más
 * que enlaces: no hay sitio para el desplegable de proyectos, ni para las
 * ejecuciones del que esté elegido, ni para las acciones que se lanzan sobre
 * él. En vertical sí, y eso convierte la navegación en el sitio desde donde se
 * trabaja y no en una fila de rótulos.
 *
 * El orden va de lo general a lo particular, y es deliberado:
 *
 *   1. Proyectos. Es el punto de partida, donde están todos los repositorios
 *      bajo análisis. Va arriba del todo porque es a donde se vuelve.
 *   2. El proyecto elegido: sus ejecuciones y lo que se lanza sobre él.
 *   3. Validación con usuarios. La parte del estudio, que es otra tarea y no
 *      una más del producto, de modo que va aparte y al final.
 *
 * Antes el bloque de arriba se llamaba «El estudio» y contenía participantes y
 * proyectos juntos. Eso mezclaba dos cosas que no se parecen: los proyectos
 * son el producto y los participantes son el experimento.
 *
 * La auditoría no la monta: quien participa en el estudio no debe ver
 * navegación, ni ejecuciones ajenas, ni métricas. Solo la tarea que se le
 * pidió.
 */

import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { USE_FIXTURES, api, clearSession, getEmail, type Execution } from "./api";
import { EXECUTIONS } from "./fixtures";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";
import { tituloCorto } from "./executions";
import { useProyecto } from "./project";
import s from "./SideNav.module.css";

/* Cuántas ejecuciones del proyecto se listan. Pasadas estas, el enlace de
   «todas» es más útil que una lista que no cabe. */
const A_LA_VISTA = 4;

export function SideNav() {
  const navigate = useNavigate();
  const email = getEmail();
  const { proyectos, actual, elegir, cargando } = useProyecto();
  const [abierto, setAbierto] = useState(false);
  /* En pantalla estrecha la columna se tumba y, desplegada entera, empuja el
     contenido fuera de la primera pantalla. Ahí se pliega tras un botón. */
  const [menu, setMenu] = useState(false);
  const [corridas, setCorridas] = useState<Execution[]>([]);
  const desplegable = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actual) return;
    if (USE_FIXTURES) {
      setCorridas(EXECUTIONS.filter((e) => e.project_id === actual.id));
      return;
    }
    let vigente = true;
    api
      .executions(actual.id)
      .then((e) => vigente && setCorridas(e))
      .catch(() => vigente && setCorridas([]));
    return () => {
      vigente = false;
    };
  }, [actual]);

  /* Cerrar al pulsar fuera y con Escape: un desplegable que solo se cierra
     con su propio botón tapa lo que hay debajo. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!desplegable.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      // La opción enfocada desaparece al cerrar, y con ella el sitio donde
      // estaba quien navega con teclado.
      selector.current?.focus();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <nav
      className={s.barra}
      data-menu={menu || undefined}
      aria-label="Navegación principal"
    >
      <div className={s.marca}>
        <Mark size={21} className={s.figura} />
        <span className={s.nombre}>Certa</span>
        <span className={s.tema}>
          <ThemeToggle />
        </span>
        <button
          type="button"
          className={s.menu}
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
        >
          {menu ? "Cerrar" : "Menú"}
        </button>
      </div>

      {USE_FIXTURES && (
        <p className={s.muestra} title="El servicio no está conectado">
          datos de muestra
        </p>
      )}

      {/* ── el punto de partida ── */}
      <ul className={s.acciones}>
        <li>
          <NavLink className={enlace} to="/projects" end>
            <Icono d="M2.8 5.2h4L8 6.8h5.2v6H2.8z" />
            Proyectos
          </NavLink>
        </li>
      </ul>

      {/* ── el proyecto elegido y lo que se puede hacer sobre él ── */}
      <div className={s.desplegable} ref={desplegable}>
        <button
          type="button"
          className={s.selector}
          ref={selector}
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-haspopup="listbox"
          disabled={cargando && proyectos.length === 0}
        >
          {/* «Proyecto» a secas, justo debajo del enlace «Proyectos», no
              dejaba ver que uno lleva a la lista y el otro dice en cuál se
              está trabajando. */}
          <span className={s.selectorRotulo}>Trabajando en</span>
          <span className={s.selectorNombre}>
            {actual?.name ?? (cargando ? "Cargando…" : "Ninguno todavía")}
          </span>
          <Flecha abierto={abierto} />
        </button>

        {abierto && (
          <ul className={s.lista} role="listbox" aria-label="Proyectos">
            {proyectos.map((p) => (
              <li key={p.id} role="option" aria-selected={p.id === actual?.id}>
                <button
                  type="button"
                  className={s.opcion}
                  data-vivo={p.id === actual?.id || undefined}
                  onClick={() => {
                    elegir(p.id);
                    setAbierto(false);
                  }}
                >
                  <span className={s.opcionNombre}>{p.name}</span>
                  <span className={s.opcionDato}>
                    {p.execution_count === 1
                      ? "1 ejecución"
                      : `${p.execution_count} ejecuciones`}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={s.opcion}
                onClick={() => {
                  setAbierto(false);
                  navigate("/projects");
                }}
              >
                <span className={s.opcionNombre}>Crear un proyecto</span>
              </button>
            </li>
          </ul>
        )}
      </div>

      {actual && (
        <section className={s.bloque}>
          <h2 className={s.rotulo}>Ejecuciones</h2>
          {corridas.length === 0 ? (
            <p className={s.vacio}>Este proyecto no tiene ninguna.</p>
          ) : (
            <ul className={s.corridas}>
              {corridas.slice(0, A_LA_VISTA).map((e) => (
                <li key={e.id}>
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? `${s.corrida} ${s.viva}` : s.corrida
                    }
                    to={`/executions/${e.id}`}
                  >
                    <span className={s.corridaId}>{tituloCorto(e)}</span>
                    <span className={s.corridaDato}>
                      {e.validated_findings} de {e.total_findings} validados
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          <ul className={s.acciones}>
            <li>
              <NavLink className={enlace} to="/executions/new">
                <Icono d="M8 3.2v9.6M3.2 8h9.6" />
                Cargar un archivo SARIF
              </NavLink>
            </li>
            {/* Siempre, no solo cuando la lista de arriba se queda corta: la
                pantalla completa trae el estado, las reglas y el avance. */}
            <li>
              <NavLink className={enlace} to="/executions" end>
                <Icono d="M2.6 4.4h10.8v7.2H2.6zM2.6 7h10.8" />
                Todas las ejecuciones
              </NavLink>
            </li>
          </ul>
        </section>
      )}

      <section className={s.bloque}>
        <h2 className={s.rotulo}>Validación con usuarios</h2>
        <ul className={s.acciones}>
          <li>
            <NavLink className={enlace} to="/participants">
              <Icono d="M8 8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM3.4 13.2c0-2.1 2.1-3.2 4.6-3.2s4.6 1.1 4.6 3.2" />
              Gestionar participantes
            </NavLink>
          </li>
        </ul>
      </section>

      <div className={s.pie}>
        {email && (
          <span className={s.quien} title={email}>
            <span className={s.inicial} aria-hidden="true">
              {email[0]}
            </span>
            <span className={s.correo}>{email}</span>
          </span>
        )}
        <button
          type="button"
          className={s.salir}
          onClick={() => {
            clearSession();
            navigate("/sign-in");
          }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}

/* NavLink pide una función para poder marcar el enlace vivo. */
function enlace({ isActive }: { isActive: boolean }) {
  return isActive ? `${s.accion} ${s.accionViva}` : s.accion;
}

function Flecha({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={s.flecha}
      data-abierto={abierto || undefined}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4.5 6.5 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
