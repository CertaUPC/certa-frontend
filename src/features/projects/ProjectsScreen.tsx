/* Los proyectos y quién está en cada uno. Es la pantalla de inicio.
 *
 * El servicio los servía desde el principio y no había pantalla: se creaba un
 * proyecto llamando a la API a mano, y los dos papeles que el diagrama lógico
 * promete, administrador y miembro, no se veían por ninguna parte.
 *
 * Quien crea el proyecto es su administrador. Los dos deciden sobre hallazgos,
 * que es para lo que existe la herramienta; lo que solo puede el administrador
 * es lo que afecta al proyecto entero.
 *
 * Aquí llega quien abre Certa, así que la pantalla tiene que contestar dos
 * preguntas y nada más: qué hay y qué hago ahora. De ahí que haya una sola
 * acción con peso, crear un proyecto, y que el formulario viva plegado detrás
 * de ella en vez de ocupar media pantalla desde el primer segundo.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api, getEmail, type Project } from "../../shared/api";
import { PROJECTS } from "../../shared/fixtures";
import { Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import { Team } from "./Team";
import s from "./ProjectsScreen.module.css";

const PANEL = "nuevo-proyecto";

export function ProjectsScreen() {
  const cargado = useApi(() => api.projects(), PROJECTS);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  if (cargado.loading) return <Loading what="los proyectos" />;
  if (cargado.error)
    return <Failed message={cargado.error} onRetry={cargado.reload} />;

  const proyectos = cargado.data ?? [];
  /* Sin ningún proyecto no hay nada que listar y la única salida es crearlo,
     de modo que pedir un clic para abrir el formulario sobra. */
  const primeraVez = proyectos.length === 0;

  return (
    <>
      <header className={s.head}>
        <div className={s.headQue}>
          <h1 className={s.title}>Proyectos</h1>
          <p className={s.lead}>
            Desde aquí arranca todo. Un proyecto es un repositorio, y cada
            ejecución que cargues pertenece a uno.
          </p>
        </div>

        {!primeraVez && (
          <button
            type="button"
            className={creando ? s.cerrar : s.primario}
            onClick={() => setCreando((c) => !c)}
            aria-expanded={creando}
            aria-controls={PANEL}
          >
            {creando ? "Cancelar" : "Crear un proyecto"}
          </button>
        )}
      </header>

      {(creando || primeraVez) && (
        <Nuevo
          id={PANEL}
          titulo={primeraVez ? "Crea tu primer proyecto" : "Nuevo proyecto"}
          pie={primeraVez ? "Después le cargas el archivo del analizador." : null}
          onCreado={() => {
            setCreando(false);
            cargado.reload();
          }}
        />
      )}

      {proyectos.length > 0 && (
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
  const cuenta = proyecto.execution_count;

  return (
    <li className={s.ficha}>
      <div className={s.fichaTop}>
        <div className={s.fichaQue}>
          <h2 className={s.nombre}>{proyecto.name}</h2>
          <p className={`${s.ruta} mono`}>{proyecto.repository_path}</p>
          {/* El rótulo solo no dice nada a quien no viene de investigación, y
              la explicación al lado cuesta una línea. */}
          {proyecto.is_public_dataset && (
            <p className={s.publico}>
              <span className={s.publicoMarca}>conjunto de referencia</span>
              <span>sus fallas ya se conocen, así que sirve para medir</span>
            </p>
          )}
        </div>

        <div className={s.fichaDatos}>
          <span className={s.dato}>
            <b className="mono">{cuenta}</b>{" "}
            {cuenta === 1 ? "ejecución" : "ejecuciones"}
          </span>
          <span className={`${s.dato} ${s.lenguaje}`}>{proyecto.language}</span>
        </div>
      </div>

      <div className={s.fichaAcciones}>
        <Link className={s.accion} to={`/executions?project=${proyecto.id}`}>
          Ver sus ejecuciones
        </Link>
        <button
          type="button"
          className={s.enlace}
          onClick={onAbrir}
          aria-expanded={abierto}
        >
          {abierto ? "Ocultar el equipo" : "Ver el equipo"}
        </button>
      </div>

      {abierto && <Team projectId={proyecto.id} yo={getEmail()} />}
    </li>
  );
}

function Nuevo({
  id,
  titulo,
  pie,
  onCreado,
}: {
  id: string;
  titulo: string;
  pie: string | null;
  onCreado: () => void;
}) {
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
    <form className={s.nuevo} id={id} onSubmit={submit}>
      <div>
        <h2 className={s.h2}>{titulo}</h2>
        {pie && <p className={s.nuevoPie}>{pie}</p>}
      </div>

      <div className={s.campos}>
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
          <small>Donde está el código de verdad. De ahí se saca el contexto.</small>
        </label>

        <label className={s.campo}>
          <span>Lenguaje</span>
          <select value={lenguaje} onChange={(e) => setLenguaje(e.target.value)}>
            <option value="java">Java</option>
          </select>
          <small>De momento solo Java.</small>
        </label>
      </div>

      <div role="alert" aria-live="assertive">
        {error && <p className={s.error}>{error}</p>}
      </div>
      <div role="status" aria-live="polite">
        {hecho && (
          <p className={s.ok}>Creado «{hecho}». Ya eres su administrador.</p>
        )}
      </div>

      <button
        className={s.submit}
        type="submit"
        disabled={trabajando}
        aria-busy={trabajando}
      >
        {trabajando ? "Creando…" : "Crear proyecto"}
      </button>
    </form>
  );
}
