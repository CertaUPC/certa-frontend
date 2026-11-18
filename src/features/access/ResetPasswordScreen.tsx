/* Fija la contraseña nueva con el token que viaja en el enlace del correo. El
   token es la única autorización: por eso esta ruta es pública. */

import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import { Mark } from "../../shared/Mark";
import { ThemeToggle } from "../../shared/ThemeToggle";
import login from "./LoginScreen.module.css";
import s from "./AccountForms.module.css";

export function ResetPasswordScreen() {
  useTheme();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, pw);
      setHecho(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.head}>
          <Mark size={22} />
          <span>Certa</span>
          <span className={s.headFin}>
            <ThemeToggle />
          </span>
        </div>

        {!token ? (
          <div className={s.body}>
            <h1 className={login.title}>Enlace inválido</h1>
            <p className={login.lede}>
              Al enlace le falta el token. Pide uno nuevo desde «Olvidé mi
              contraseña».
            </p>
            <p className={s.foot}>
              <Link to="/olvide">Pedir un enlace nuevo</Link>
            </p>
          </div>
        ) : hecho ? (
          <div className={s.body}>
            <h1 className={login.title}>Listo</h1>
            <p className={s.ok}>
              Tu contraseña quedó cambiada. Ya puedes entrar con la nueva.
            </p>
            <p className={s.foot}>
              <Link to="/sign-in">Iniciar sesión</Link>
            </p>
          </div>
        ) : (
          <form className={s.body} onSubmit={submit} noValidate>
            <h1 className={login.title}>Nueva contraseña</h1>
            <p className={login.lede}>Elige una contraseña para tu cuenta.</p>
            <label className={login.field}>
              <span>Nueva contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={8}
                aria-invalid={error ? true : undefined}
              />
              <span className={login.nota}>Ocho caracteres como mínimo.</span>
            </label>
            <label className={login.field}>
              <span>Repite la contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <p className={login.error}>{error}</p>}
            <button
              className={login.submit}
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
