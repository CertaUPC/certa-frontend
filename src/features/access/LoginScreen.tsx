import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, USE_FIXTURES, api, saveSession, type Role } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import s from "./LoginScreen.module.css";

export function LoginScreen() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("investigador");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (USE_FIXTURES) {
        // Sin servicio conectado se entra con el rol elegido, para poder
        // recorrer las dos vistas. Nunca ocurre contra un servicio real.
        saveSession("muestra", role);
      } else {
        const r = await api.login(email, password);
        saveSession(r.access_token, r.role);
      }
      navigate("/executions");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio. Revisa que esté levantado.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.wrap}>
      <form className={s.card} onSubmit={submit}>
        <p className={s.wordmark}>Certa</p>
        <h1 className={s.title}>Entrar</h1>
        <p className={s.lead}>
          Validación de hallazgos de análisis estático de seguridad.
        </p>

        <label className={s.field}>
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!USE_FIXTURES}
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
          />
        </label>

        {USE_FIXTURES && (
          <label className={s.field}>
            <span>Rol, mientras no hay servicio conectado</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="investigador">Investigador</option>
              <option value="lider_tecnico">Líder técnico</option>
              <option value="desarrollador">Desarrollador</option>
            </select>
          </label>
        )}

        {error && <p className={s.error}>{error}</p>}

        <button className={s.submit} type="submit" disabled={busy}>
          {busy ? "Entrando" : "Entrar"}
        </button>

        <div className={s.foot}>
          <button type="button" className={s.linkish} onClick={toggle}>
            Cambiar a tema {theme === "dark" ? "claro" : "oscuro"}
          </button>
          <a className={s.linkish} href="/session">
            Soy participante del estudio
          </a>
        </div>
      </form>
    </div>
  );
}
