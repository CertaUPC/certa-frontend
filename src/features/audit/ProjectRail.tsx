/* Dónde estoy y a dónde puedo ir, sin salir de la auditoría.
 *
 * La pantalla de revisión libre entregaba 2166 alertas y ninguna salida: no
 * decía de qué proyecto eran, no dejaba cambiar de ejecución y no llevaba a
 * ninguna otra parte. Quien entraba por el enlace tenía que editar la barra
 * de direcciones para volver.
 *
 * Esto NO se monta durante una sesión medida. Quien participa ve la tarea y
 * nada más: un desplegable con otros proyectos sería una salida del
 * instrumento, y el tiempo de mirarlo entraría en la medición.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Execution, type Project } from "../../shared/api";
import s from "./ProjectRail.module.css";

interface Props {
  /** La ejecución que se está revisando ahora. */
  executionId: string;
}

export function ProjectRail({ executionId }: Props) {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Project[] | null>(null);
  const [ejecuciones, setEjecuciones] = useState<Execution[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const desplegable = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([api.projects(), api.executions()])
      .then(([p, e]) => {
        if (!vigente) return;
        setProyectos(p);
        setEjecuciones(e);
      })
      .catch(() => {
        /* El carril es orientación, no la tarea. Si el servicio no responde
           la auditoría sigue funcionando y aquí no se pinta nada. */
      });
    return () => {
      vigente = false;
    };
  }, []);

  /* Cerrar al pulsar fuera y con Escape: un desplegable que solo se cierra
     con su propio botón deja tapada la lista de alertas. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!desplegable.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  const actual = ejecuciones?.find((e) => e.id === executionId) ?? null;
  const proyecto =
    proyectos?.find((p) => p.id === actual?.project_id) ?? null;
  const hermanas = (ejecuciones ?? []).filter(
    (e) => e.project_id === actual?.project_id,
  );

  function irA(p: Project) {
    setAbierto(false);
    /* Al elegir proyecto se abre su ejecución más reciente. Si todavía no
       tiene ninguna, el sitio al que hay que ir es la carga del SARIF. */
    const suya = (ejecuciones ?? []).filter((e) => e.project_id === p.id);
    if (suya.length === 0) navigate("/executions/new");
    else navigate(`/review?execution=${suya[0].id}`);
  }

  return (
    <div className={s.carril}>
      <div className={s.desplegable} ref={desplegable}>
        <button
          type="button"
          className={s.selector}
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-haspopup="listbox"
        >
          <span className={s.selectorEtiqueta}>Proyecto</span>
          <span className={s.selectorNombre}>
            {proyecto?.name ?? actual?.project_name ?? "Sin proyecto"}
          </span>
          <Flecha abierto={abierto} />
        </button>

        {abierto && (
          <ul className={s.lista} role="listbox" aria-label="Proyectos">
            {(proyectos ?? []).map((p) => (
              <li key={p.id} role="option" aria-selected={p.id === proyecto?.id}>
                <button
                  type="button"
                  className={s.opcion}
                  onClick={() => irA(p)}
                  data-vivo={p.id === proyecto?.id || undefined}
                >
                  <span className={s.opcionNombre}>{p.name}</span>
                  <span className={s.opcionDato}>
                    {p.execution_count === 1
                      ? "1 ejecución"
                      : `${p.execution_count} ejecuciones`}
                    {p.is_public_dataset && " · conjunto de referencia"}
                  </span>
                </button>
              </li>
            ))}
            {proyectos?.length === 0 && (
              <li className={s.vacio}>Todavía no has creado ninguno.</li>
            )}
          </ul>
        )}
      </div>

      {hermanas.length > 1 && (
        <section className={s.bloque}>
          <h2 className={s.rotulo}>Ejecuciones</h2>
          <ul className={s.corridas}>
            {hermanas.map((e) => (
              <li key={e.id}>
                <Link
                  className={s.corrida}
                  to={`/review?execution=${e.id}`}
                  aria-current={e.id === executionId ? "page" : undefined}
                >
                  <span className={`${s.corridaId} mono`}>{e.id.slice(0, 8)}</span>
                  <span className={s.corridaDato}>
                    {e.total_findings} alertas · {fecha(e.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={s.bloque}>
        <h2 className={s.rotulo}>
          {proyecto ? `Sobre ${recorta(proyecto.name)}` : "Acciones"}
        </h2>
        <ul className={s.acciones}>
          <li>
            <Link className={s.accion} to={`/executions/${executionId}`}>
              <Icono d="M3 3.6h10.4M3 8h10.4M3 12.4h6.6" />
              Ver el detalle y sus métricas
            </Link>
          </li>
          <li>
            <Link className={s.accion} to="/executions/new">
              <Icono d="M8 3.2v9.6M3.2 8h9.6" />
              Cargar otro SARIF
            </Link>
          </li>
          <li>
            <Link className={s.accion} to="/executions">
              <Icono d="M2.6 4.4h10.8v7.2H2.6zM2.6 7h10.8" />
              Todas las ejecuciones
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

/* El nombre del proyecto va dentro de un encabezado de doce pixeles: pasado
   ese largo parte la línea y empuja la lista de alertas hacia abajo. */
function recorta(nombre: string) {
  return nombre.length > 22 ? `${nombre.slice(0, 21)}…` : nombre;
}

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  });
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
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
