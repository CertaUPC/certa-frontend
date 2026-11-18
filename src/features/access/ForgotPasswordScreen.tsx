/* Pide el enlace para restablecer la contraseña. El servicio responde igual
   exista la cuenta o no, así que la pantalla no confirma nada: solo dice que si
   el correo tiene cuenta, el enlace va en camino. */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import { Mark } from "../../shared/Mark";
import { ThemeToggle } from "../../shared/ThemeToggle";
import login from "./LoginScreen.module.css";
import s from "./AccountForms.module.css";

export function ForgotPasswordScreen() {
  useTheme();
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setEnviado(true);
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

        {enviado ? (
          <div className={s.body}>
            <h1 className={login.title}>Revisa tu correo</h1>
            <p className={s.ok}>
              Si <b>{email}</b> tiene una cuenta, te enviamos un enlace para
              crear una nueva contraseña. Caduca en una hora.
            </p>
            <p className={s.foot}>
              <Link to="/sign-in">Volver a iniciar sesión</Link>
            </p>
          </div>
        ) : (
          <form className={s.body} onSubmit={submit} noValidate>
            <h1 className={login.title}>Restablecer contraseña</h1>
            <p className={login.lede}>
              Te enviaremos un enlace a tu correo para crear una nueva.
            </p>
            <label className={login.field}>
              <span>Correo</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={error ? true : undefined}
                placeholder="correo@ejemplo.com"
              />
            </label>
            {error && <p className={login.error}>{error}</p>}
            <button
              className={login.submit}
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Enviando…" : "Enviar enlace"}
            </button>
            <p className={s.foot}>
              <Link to="/sign-in">Volver a iniciar sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
