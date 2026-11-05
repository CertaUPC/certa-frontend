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
import { Glyph } from "../../shared/Glyph";
import { useProyecto } from "../../shared/project";
import { Hint } from "../../shared/Hint";
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

/* El identificador hay que pasarlo a mano a la consola del trabajador, y es
   un UUID: teclearlo es pedir una errata. El botón lo copia y lo dice, porque
   un clic sin respuesta deja a cualquiera dudando de si funcionó. */
function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CopiarId({ id }: { id: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(id);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sin permiso de portapapeles queda el texto a la vista para
         seleccionarlo, que es lo que se hacía antes de que existiera. */
    }
  }

  return (
    <button
      type="button"
      className={s.copiar}
      onClick={copiar}
      aria-label={`Copiar el identificador del proyecto ${id}`}
    >
      {copiado ? "copiado" : "copiar"}
    </button>
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
          {/* El identificador, no la ruta: es lo que hay que darle al
              trabajador para que tome las ejecuciones de este proyecto. */}
          <p className={s.ruta}>
            <span className="mono">{proyecto.id}</span>
            <CopiarId id={proyecto.id} />
          </p>
          {/* El rótulo solo no dice nada a quien no viene de investigación, y
              la explicación al lado cuesta una línea. */}
          {/* La glosa estaba en cada ficha. Con dos proyectos ya se repetía,
              con veinte sería una pared. */}
          {proyecto.is_public_dataset && (
            <p className={s.publico}>
              <span className={s.publicoMarca}>conjunto de referencia</span>
              <Hint termino="conjunto de referencia">
                De cada alerta de este repositorio ya se sabe si era real, así
                que sirve para medir cuánto acierta el asistente.
              </Hint>
            </p>
          )}
        </div>

        <div className={s.fichaDatos}>
          <span className={s.dato}>
            <b className="mono">{cuenta}</b>{" "}
            {cuenta === 1 ? "ejecución" : "ejecuciones"}
          </span>
          {/* Cuántas había no dice si el proyecto sigue vivo. La última y su
              fecha, sí, y es lo que el criterio pide del listado. */}
          {proyecto.last_execution_at && (
            <span className={s.dato} title={proyecto.last_execution_label ?? ""}>
              última: {fechaCorta(proyecto.last_execution_at)}
            </span>
          )}
          {/* El lenguaje con su dibujo: la etiqueta decía «java» en
              minúscula y parecía una extensión de archivo. */}
          <span className={`${s.dato} ${s.lenguaje}`}>
            {proyecto.language === "java" ? (
              <>
                <Glyph figura="java" tam={14} />
                Java
              </>
            ) : (
              proyecto.language
            )}
          </span>
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
  // Fijo mientras solo haya un lenguaje con conjuntos de verdad conocida.
  const lenguaje = "java";
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const { recargar, elegir } = useProyecto();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHecho(null);
    setTrabajando(true);
    try {
      const p = await api.createProject(nombre.trim(), lenguaje);
      setHecho(p.name);
      setNombre("");
      /* La barra tiene su propia lista de proyectos, cargada al entrar. Sin
         este aviso, el recién creado no estaba en ella: pedir sus ejecuciones
         caía al primero de la lista y la pantalla enseñaba otro proyecto. */
      recargar();
      elegir(p.id);
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

        {/* Un desplegable con una sola opción promete una elección que no
            existe. Cuando haya un segundo lenguaje, vuelve a ser desplegable. */}
        <div className={s.campo}>
          <span>Lenguaje</span>
          <p className={s.fijo}>Java</p>
          <small>Es el único con conjuntos de verdad conocida para medir.</small>
        </div>
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
