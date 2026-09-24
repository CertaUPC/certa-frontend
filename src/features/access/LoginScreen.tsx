/* La entrada al sistema, con sus dos caminos.
 *
 * El participante tenía antes un enlace a `/session` que no llevaba a ninguna
 * parte, porque esa pantalla necesita participante, condición y lote en la
 * dirección. Acababa entrando en el navegador del investigador, con la sesión
 * de este abierta. Ahora escribe el código que se le dicta y el servicio le
 * devuelve su propia credencial, acotada a su participación. No se le pide
 * contraseña: el consentimiento promete que no se recoge nada que le
 * identifique.
 */

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, USE_FIXTURES, api, saveSession, type Role } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import s from "./LoginScreen.module.css";

type Camino = "equipo" | "participante";

const CAMINOS: { id: Camino; rotulo: string; describe: string }[] = [
  {
    id: "equipo",
    rotulo: "Soy del equipo",
    describe: "Entra con tu correo para ver tus proyectos y sus ejecuciones.",
  },
  {
    id: "participante",
    rotulo: "Participo en el estudio",
    describe: "Escribe el código que te dictó quien dirige la sesión.",
  },
];

export function LoginScreen() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [camino, setCamino] = useState<Camino>("equipo");
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
      const r = await api.login(email, password);
      saveSession(r.access_token, r.role);
    }
    navigate("/executions");
  }

  async function entrarComoParticipante() {
    const r = await api.participantAccess(codigo);
    saveSession(r.access_token, "desarrollador");
    const primera = r.order[0] ?? "con_asistente";
    navigate(
      `/session?participant=${r.participant_id}` +
        `&condition=${primera}&batch=${r.first_batch}`,
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
    <main className={s.wrap} aria-labelledby="titulo-entrada">
      <form className={s.card} onSubmit={submit} noValidate>
        <div className={s.marca}>
          <span className={s.sello} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor">
              <rect x="11" y="8.5" width="13" height="2.6" rx="1.3" opacity="0.42" />
              <rect x="9.6" y="14.6" width="14.4" height="2.8" rx="1.4" />
              <rect x="11" y="20.9" width="9" height="2.6" rx="1.3" opacity="0.42" />
              <path d="M4.6 13.4 8.4 16l-3.8 2.6z" />
            </svg>
          </span>
          <p className={s.wordmark}>Certa</p>
        </div>

        <h1 className={s.title} id="titulo-entrada">
          Entrar
        </h1>
        <p className={s.lead}>
          Validación de hallazgos de análisis estático de seguridad.
        </p>

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
            {CAMINOS.find((c) => c.id === camino)!.describe}
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
                  placeholder="u202211399@upc.edu.pe"
                />
              </label>

              <label className={s.field}>
                <span>Contraseña</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!USE_FIXTURES}
                  aria-invalid={invalido}
                  aria-describedby={error ? "fallo-entrada" : undefined}
                />
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
          {camino === "equipo" ? "Entrar" : "Empezar la sesión"}
        </button>

        <div className={s.foot}>
          <button type="button" className={s.linkish} onClick={toggle}>
            Cambiar a tema {theme === "dark" ? "claro" : "oscuro"}
          </button>
        </div>
      </form>
    </main>
  );
}
