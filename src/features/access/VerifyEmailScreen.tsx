/* Confirma el correo con el token del enlace. La verificación se dispara sola
   al abrir la página; el token es la autorización, así que la ruta es pública. */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../../shared/api";
import { useTheme } from "../../shared/theme";
import { Mark } from "../../shared/Mark";
import { ThemeToggle } from "../../shared/ThemeToggle";
import login from "./LoginScreen.module.css";
import s from "./AccountForms.module.css";

type Estado = "verificando" | "ok" | "error";

export function VerifyEmailScreen() {
  useTheme();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "error");
  const [error, setError] = useState<string | null>(
    token ? null : "Al enlace le falta el token.",
  );

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    api
      .verifyEmail(token)
      .then(() => {
        if (vivo) setEstado("ok");
      })
      .catch((err) => {
        if (!vivo) return;
        setEstado("error");
        setError(
          err instanceof ApiError ? err.message : "No se pudo verificar.",
        );
      });
    return () => {
      vivo = false;
    };
  }, [token]);

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

        {estado === "verificando" && (
          <div className={s.estado}>
            <h1 className={login.title}>Verificando…</h1>
            <p>Un momento.</p>
          </div>
        )}
        {estado === "ok" && (
          <>
            <h1 className={login.title}>Correo verificado</h1>
            <p className={s.ok}>Tu correo quedó confirmado. Gracias.</p>
            <p className={s.foot}>
              <Link to="/sign-in">Iniciar sesión</Link>
            </p>
          </>
        )}
        {estado === "error" && (
          <>
            <h1 className={login.title}>No se pudo verificar</h1>
            <p className={login.error}>{error}</p>
            <p className={s.foot}>
              <Link to="/sign-in">Volver a iniciar sesión</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
