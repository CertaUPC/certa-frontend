/* La entrada al sistema, con sus dos caminos.
 *
 * El participante tenía antes un enlace a `/session` que no llevaba a ninguna
 * parte, porque esa pantalla necesita participante, condición y lote en la
 * dirección. Acababa entrando en el navegador del investigador, con la sesión
 * de este abierta. Ahora escribe el código que se le dicta y el servicio le
 * devuelve su propia credencial, acotada a su participación. No se le pide
 * contraseña: el consentimiento promete que no se recoge nada que le
 * identifique.
 *
 * El panel de la izquierda cambia con el camino elegido, y no es adorno. A
 * quien viene del equipo le enseña lo que la herramienta hace, con un hallazgo
 * del corpus y sus líneas citadas. A quien viene a participar NO se le enseña
 * código: ver una alerta ya resuelta antes de empezar sesgaría la tarea que se
 * está midiendo.
 */

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, USE_FIXTURES, api, saveSession, type Role } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import { Mark } from "../../shared/Mark";
import { ThemeToggle } from "../../shared/ThemeToggle";
import s from "./LoginScreen.module.css";

type Camino = "equipo" | "participante";

/* Dentro del camino del equipo, entrar o darse de alta. El alta existe
   porque el producto se registra solo: quien descarga el trabajador crea su
   cuenta, se emite sus credenciales y analiza su repositorio sin pedirle
   permiso a nadie. Hasta ahora esa puerta estaba en el servicio pero no en
   la pantalla, de modo que la unica via era llamar a la API a mano. */
type Modo = "entrar" | "crear";

const CAMINOS: { id: Camino; rotulo: string; describe: string }[] = [
  {
    id: "equipo",
    rotulo: "Iniciar sesión",
    describe: "Entra con tu correo para ver tus proyectos y sus ejecuciones.",
  },
  {
    id: "participante",
    rotulo: "Participante del estudio",
    describe: "Escribe el código que te dictó quien dirige la sesión.",
  },
];

/* Lo que el panel del equipo va diciendo. Los tres hablan del mismo fragmento
   y cada uno señala una propiedad distinta de la cadena, de modo que quien se
   queda mirando la pantalla mientras teclea aprende tres cosas y no una. */
const LEMAS = [
  {
    lema: "Cada veredicto señala líneas, y esas líneas se comprueban contra el archivo.",
    nota: (
      <>
        El modelo dijo que el valor de la petición llega hasta{" "}
        <code>pb.start()</code>, y citó las líneas 78, 80 y 83. Certa las buscó
        en el archivo: están, y dicen eso. Cuando no están, el veredicto se
        marca como no verificable en lugar de presentarse como respaldado.
      </>
    ),
  },
  {
    lema: "El contexto alcanza al método al que se delega el dato.",
    nota: (
      <>
        El analizador ve este archivo. Certa recupera del árbol sintáctico la
        función, sus llamadores y los saneadores que la traza atraviesa, y eso
        subió la cobertura del modelo del 49 al 95 por ciento.
      </>
    ),
  },
  {
    lema: "Ordena sin suprimir. La decisión sigue siendo tuya.",
    nota: (
      <>
        Nada se retira del registro. La herramienta calcula un orden, lo
        explica y lo deja auditable; qué se atiende primero lo decide el equipo
        que conoce su producto.
      </>
    ),
  },
];

/* Cada cuántos milisegundos cambia. Lo bastante largo para leerlo entero sin
   prisa, y para que no distraiga a quien está escribiendo su contraseña. */
const CADA = 7000;

/* Un hallazgo real del corpus, recortado a la ventana que se lee de un
   vistazo. El archivo, los números y las líneas citadas son los del análisis
   que está cargado en el despliegue. */
const FRAGMENTO = {
  archivo: "BenchmarkTest00897.java",
  metodo: "doPost",
  lineas: [
    { n: 78, texto: '    String[] args = {a1, a2, "echo " + bar};', citada: true },
    { n: 79, texto: "" },
    { n: 80, texto: "    ProcessBuilder pb = new ProcessBuilder(args);", citada: true },
    { n: 81, texto: "" },
    { n: 82, texto: "    try {" },
    { n: 83, texto: "        Process p = pb.start();", citada: true },
  ],
};

export function LoginScreen() {
  const navigate = useNavigate();
  useTheme();

  const [camino, setCamino] = useState<Camino>("equipo");
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [role, setRole] = useState<Role>("investigador");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const correoRef = useRef<HTMLInputElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  const pestanasRef = useRef<(HTMLButtonElement | null)[]>([]);

  function cambiarCamino(siguiente: Camino) {
    setCamino(siguiente);
    setModo("entrar");
    setError(null);
  }

  /* Sin la navegación por flechas, el papel «tab» miente. */
  function porTeclado(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const salto = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!salto) return;
    e.preventDefault();
    const siguiente = (indice + salto + CAMINOS.length) % CAMINOS.length;
    cambiarCamino(CAMINOS[siguiente].id);
    pestanasRef.current[siguiente]?.focus();
  }

  async function entrarComoEquipo() {
    if (USE_FIXTURES) {
      // Sin servicio conectado se entra con el rol elegido, para poder
      // recorrer las dos vistas. Nunca ocurre contra un servicio real.
      saveSession("muestra", role);
    } else {
      // Crear la cuenta y entrar son un solo gesto: nadie se registra para
      // quedarse fuera.
      if (modo === "crear") await api.register(email, password);
      const r = await api.login(email, password);
      saveSession(r.access_token, r.role);
    }
    navigate("/executions");
  }

  async function entrarComoParticipante() {
    const r = await api.participantAccess(codigo);
    if (!r.execution_id) {
      throw new ApiError(
        409,
        "El estudio no tiene un lote congelado. Avisa a quien dirige la sesión.",
      );
    }
    saveSession(r.access_token, "desarrollador");

    /* Las dos condiciones van en la dirección, y no en memoria, para que
       recargar a mitad de sesión no pierda cuál toca después. */
    const [primera, segunda] = r.order;
    navigate(
      `/session?execution=${r.execution_id}&participant=${r.participant_id}` +
        `&condition=${primera}&batch=${r.first_batch}` +
        `&next_condition=${segunda}&next_batch=${r.second_batch}`,
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (camino === "equipo") await entrarComoEquipo();
      else await entrarComoParticipante();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio. Revisa que esté levantado.",
      );
      // El foco vuelve al campo del que depende el fallo.
      (camino === "equipo" ? correoRef : codigoRef).current?.focus();
    } finally {
      setBusy(false);
    }
  }

  const invalido = error ? true : undefined;

  return (
    <div className={s.split}>
      <aside className={s.stage}>
        <div className={s.brand}>
          <Mark size={27} className={s.brandMark} />
          <span className={s.brandName}>Certa</span>
          <span className={s.brandFin}>
            <ThemeToggle sobreOscuro />
          </span>
        </div>

        {camino === "equipo" ? <PanelEquipo /> : <PanelParticipante />}

        <p className={s.colophon}>
          Universidad Peruana de Ciencias Aplicadas, Ingeniería de Software
        </p>
      </aside>

      <main className={s.formSide} aria-labelledby="titulo-entrada">
        <form className={s.form} onSubmit={submit} noValidate>
          {/* Solo cuando el panel no cabe: sin él, la pantalla no dice de
              quién es ni deja cambiar el tema. */}
          <div className={s.formBrand}>
            <Mark size={22} />
            <span>Certa</span>
            <span className={s.formBrandFin}>
              <ThemeToggle />
            </span>
          </div>

          <h1 className={s.title} id="titulo-entrada">
            {camino === "participante"
              ? "Entrar a tu sesión"
              : modo === "crear"
                ? "Crear cuenta"
                : "Entrar"}
          </h1>
          {camino === "equipo" && (
            <p className={s.lede}>
              La sesión sigue abierta ocho horas en este navegador.
            </p>
          )}

          <div className={s.pestanas} role="tablist" aria-label="Cómo quieres entrar">
            {CAMINOS.map((c, i) => (
              <button
                key={c.id}
                ref={(el) => {
                  pestanasRef.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`pestana-${c.id}`}
                aria-selected={camino === c.id}
                aria-controls={`panel-${c.id}`}
                tabIndex={camino === c.id ? 0 : -1}
                className={camino === c.id ? s.pestanaViva : s.pestana}
                onClick={() => cambiarCamino(c.id)}
                onKeyDown={(e) => porTeclado(e, i)}
              >
                {c.rotulo}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${camino}`}
            aria-labelledby={`pestana-${camino}`}
            className={s.panel}
          >
            <p className={s.ayuda}>
              {camino === "equipo" && modo === "crear"
                ? "Con tu cuenta registras un proyecto, lanzas el análisis desde tu máquina y decides sobre lo que salga."
                : CAMINOS.find((c) => c.id === camino)!.describe}
            </p>

            {camino === "equipo" ? (
              <>
                <label className={s.field}>
                  <span>Correo</span>
                  <input
                    ref={correoRef}
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!USE_FIXTURES}
                    aria-invalid={invalido}
                    aria-describedby={error ? "fallo-entrada" : undefined}
                    placeholder="nombre@upc.edu.pe"
                  />
                </label>

                <label className={s.field}>
                  <span>Contraseña</span>
                  <input
                    type="password"
                    autoComplete={
                      modo === "crear" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!USE_FIXTURES}
                    minLength={modo === "crear" ? 8 : undefined}
                    aria-invalid={invalido}
                    aria-describedby={
                      [error && "fallo-entrada", modo === "crear" && "minimo"]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                  {modo === "crear" && (
                    <span className={s.nota} id="minimo">
                      Ocho caracteres como mínimo.
                    </span>
                  )}
                </label>

                {USE_FIXTURES && (
                  <label className={s.field}>
                    <span>Rol, mientras no hay servicio conectado</span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                    >
                      <option value="investigador">Investigador</option>
                      <option value="lider_tecnico">Líder técnico</option>
                      <option value="desarrollador">Desarrollador</option>
                    </select>
                  </label>
                )}
              </>
            ) : (
              <label className={s.field}>
                <span>Código de participante</span>
                <input
                  ref={codigoRef}
                  className={s.codigo}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  required
                  aria-invalid={invalido}
                  aria-describedby={
                    error ? "fallo-entrada nota-codigo" : "nota-codigo"
                  }
                  placeholder="P01"
                />
                <span className={s.nota} id="nota-codigo">
                  No escribas tu nombre ni tu correo. El código es lo único que
                  se guarda de ti.
                </span>
              </label>
            )}
          </div>

          {/* Lo que el sistema dice en voz alta: el fallo y el trabajo en curso. */}
          <div className={s.aviso} role="alert" aria-live="assertive">
            {error && (
              <p className={s.error} id="fallo-entrada">
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  className={s.iconoError}
                >
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" fill="none" />
                  <path d="M10 6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="10" cy="14" r="1" fill="currentColor" />
                </svg>
                {error}
              </p>
            )}
            {busy && <p className={s.trabajando}>Comprobando…</p>}
          </div>

          <button className={s.submit} type="submit" disabled={busy} aria-busy={busy}>
            {camino === "participante"
              ? "Empezar la sesión"
              : modo === "crear"
                ? "Crear cuenta y entrar"
                : "Entrar"}
          </button>

          <div className={s.foot}>
            {camino === "equipo" && (
              <p className={s.switch}>
                {modo === "entrar" ? "¿Primera vez aquí?" : "¿Ya tienes cuenta?"}{" "}
                <button
                  type="button"
                  className={s.linkish}
                  onClick={() => {
                    setModo(modo === "entrar" ? "crear" : "entrar");
                    setError(null);
                    correoRef.current?.focus();
                  }}
                >
                  {modo === "entrar" ? "Crear una cuenta" : "Entrar con la tuya"}
                </button>
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

/* A quien trabaja se le enseña el mecanismo, porque es lo que va a usar. */
function PanelEquipo() {
  const [cual, setCual] = useState(0);

  /* Quien pide menos movimiento se queda con el primero, que es el que
     sostiene el aporte. */
  useEffect(() => {
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (quieto?.matches) return;
    const t = setInterval(() => setCual((n) => (n + 1) % LEMAS.length), CADA);
    return () => clearInterval(t);
  }, []);

  const actual = LEMAS[cual];

  return (
    <div className={s.stageBody}>
      <h2 className={s.claim} key={`lema-${cual}`}>
        {actual.lema}
      </h2>

      <figure className={s.proof}>
        <figcaption className={s.proofHead}>
          <span className={s.proofFile}>{FRAGMENTO.archivo}</span>
          <span className={s.proofMethod}>{FRAGMENTO.metodo}</span>
        </figcaption>

        <pre className={s.code} aria-hidden="true">
          {FRAGMENTO.lineas.map((l, i) => (
            <span
              key={l.n}
              className={l.citada ? s.lineMarked : s.line}
              style={l.citada ? { animationDelay: `${200 + i * 110}ms` } : undefined}
            >
              <span className={s.gutter}>{l.n}</span>
              {l.texto}
            </span>
          ))}
        </pre>

        <p className={s.proofNote} key={`nota-${cual}`}>
          {actual.nota}
        </p>

        <span className={s.pasos} aria-hidden="true">
          {LEMAS.map((_, i) => (
            <span key={i} className={i === cual ? s.pasoVivo : s.paso} />
          ))}
        </span>
      </figure>
    </div>
  );
}

/* A quien viene a participar no se le enseña ni una alerta. Lo que necesita
   antes de empezar son las condiciones que aceptó al consentir. */
function PanelParticipante() {
  return (
    <div className={s.stageBody}>
      <h2 className={s.claim}>
        Vas a revisar alertas de seguridad. No hay nada que preparar ni
        respuestas que memorizar.
      </h2>

      <dl className={s.terms}>
        <div>
          <dt>Cuánto dura</dt>
          <dd>Cerca de una hora, en dos partes, con un descanso entre ellas.</dd>
        </div>
        <div>
          <dt>Qué se guarda</dt>
          <dd>
            El código que te dictaron y lo que respondas. Ni tu nombre, ni tu
            correo, ni dónde trabajas.
          </dd>
        </div>
        <div>
          <dt>Si quieres parar</dt>
          <dd>
            Puedes dejarlo cuando quieras, sin explicar por qué, y lo que
            llevabas se retira.
          </dd>
        </div>
      </dl>
    </div>
  );
}
