/* Los proyectos y quién está en cada uno.
 *
 * El servicio los servía desde el principio y no había pantalla: se creaba un
 * proyecto llamando a la API a mano, y los dos papeles que el diagrama lógico
 * promete, administrador y miembro, no se veían por ninguna parte.
 *
 * Quien crea el proyecto es su administrador. Los dos deciden sobre hallazgos,
 * que es para lo que existe la herramienta; lo que solo puede el administrador
 * es lo que afecta al proyecto entero.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api, getEmail, type Project } from "../../shared/api";
import { PROJECTS } from "../../shared/fixtures";
import { Empty, Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import { Team } from "./Team";
import s from "./ProjectsScreen.module.css";

export function ProjectsScreen() {
  const cargado = useApi(() => api.projects(), PROJECTS);
  const [abierto, setAbierto] = useState<string | null>(null);

  if (cargado.loading) return <Loading what="los proyectos" />;
  if (cargado.error)
    return <Failed message={cargado.error} onRetry={cargado.reload} />;

  const proyectos = cargado.data ?? [];

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Proyectos</h1>
          <p className={s.lead}>
            Un proyecto es un repositorio bajo análisis. Cada ejecución
            pertenece a uno, y quién puede verla lo decide quién está aquí
            dentro.
          </p>
        </div>
      </div>

      <div className={s.cols}>
        <div>
          {proyectos.length === 0 ? (
            <Empty title="Todavía no tienes ningún proyecto">
              <p>
                Crea el primero con la ruta del repositorio que vas a analizar.
                Después cargas su informe SARIF.
              </p>
            </Empty>
          ) : (
            <ul className={s.lista}>
              {proyectos.map((p) => (
                <Ficha
                  key={p.id}
                  proyecto={p}
                  abierto={abierto === p.id}
                  onAbrir={() => setAbierto(abierto === p.id ? null : p.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <Nuevo onCreado={cargado.reload} />
      </div>
    </>
  );
}

function Ficha({
  proyecto,
  abierto,
  onAbrir,
}: {
  proyecto: Project;
  abierto: boolean;
  onAbrir: () => void;
}) {
  return (
    <li className={s.ficha}>
      <div className={s.fichaTop}>
        <div className={s.fichaQue}>
          <h2 className={s.nombre}>
            {proyecto.name}
            {proyecto.is_public_dataset && (
              <span className={s.publico}>conjunto de referencia</span>
            )}
          </h2>
          <p className={`${s.ruta} mono`}>{proyecto.repository_path}</p>
        </div>
        <div className={s.fichaDatos}>
          <span className={s.dato}>
            <b className="mono">{proyecto.execution_count}</b>{" "}
            {proyecto.execution_count === 1 ? "ejecución" : "ejecuciones"}
          </span>
          <span className={`${s.dato} ${s.lenguaje}`}>{proyecto.language}</span>
        </div>
      </div>

      <div className={s.fichaAcciones}>
        <Link className={s.enlace} to={`/executions?project=${proyecto.id}`}>
          Ver sus ejecuciones
        </Link>
        <button
          type="button"
          className={s.enlace}
          onClick={onAbrir}
          aria-expanded={abierto}
        >
          {abierto ? "Ocultar el equipo" : "Equipo"}
        </button>
      </div>

      {abierto && <Team projectId={proyecto.id} yo={getEmail()} />}
    </li>
  );
}

function Nuevo({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [ruta, setRuta] = useState("");
  const [lenguaje, setLenguaje] = useState("java");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHecho(null);
    setTrabajando(true);
    try {
      const p = await api.createProject(nombre.trim(), ruta.trim(), lenguaje);
      setHecho(p.name);
      setNombre("");
      setRuta("");
      onCreado();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <form className={s.nuevo} onSubmit={submit}>
      <h2 className={s.h2}>Crear un proyecto</h2>

      <label className={s.campo}>
        <span>Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Portal de clientes"
          maxLength={200}
          required
        />
      </label>

      <label className={s.campo}>
        <span>Ruta del repositorio</span>
        <input
          className="mono"
          value={ruta}
          onChange={(e) => setRuta(e.target.value)}
          placeholder="/repos/portal"
          required
        />
        <small>
          Identifica al proyecto. El trabajador lee de ahí para recuperar el
          contexto, así que tiene que ser la ruta donde el código está de
          verdad.
        </small>
      </label>

      <label className={s.campo}>
        <span>Lenguaje</span>
        <select value={lenguaje} onChange={(e) => setLenguaje(e.target.value)}>
          <option value="java">Java</option>
        </select>
        <small>
          De momento solo Java: es donde hay conjuntos con verdad conocida
          contra los que medir.
        </small>
      </label>

      <div role="alert" aria-live="assertive">
        {error && <p className={s.error}>{error}</p>}
      </div>
      <div role="status" aria-live="polite">
        {hecho && <p className={s.ok}>Creado «{hecho}». Ya eres su administrador.</p>}
      </div>

      <button className={s.submit} type="submit" disabled={trabajando} aria-busy={trabajando}>
        {trabajando ? "Creando…" : "Crear proyecto"}
      </button>
    </form>
  );
}
