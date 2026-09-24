/* Armazón de las pantallas de investigación.
 *
 * La auditoría no lo usa: quien participa no debe ver navegación, ni
 * ejecuciones ajenas, ni métricas. Solo la tarea que se le pidió.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { USE_FIXTURES, clearSession, getEmail } from "./api";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";
import s from "./AppShell.module.css";

const NAV = [
  { to: "/projects", label: "Proyectos" },
  { to: "/executions", label: "Ejecuciones" },
  { to: "/participants", label: "Participantes" },
];

export function AppShell() {
  const navigate = useNavigate();
  const email = getEmail();

  return (
    <div className={s.shell}>
      {/* Con tres enlaces y dos acciones en la barra, tabular hasta el contenido
          son cinco saltos en cada pantalla. */}
      <a className={s.salto} href="#contenido">
        Saltar al contenido
      </a>

      <header className={s.top}>
        <span className={s.brand}>
          <Mark size={22} className={s.brandMark} />
          <span className={s.wordmark}>Certa</span>
        </span>

        <nav className={s.nav}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className={s.right}>
          {USE_FIXTURES && (
            <span className={s.fixture} title="El servicio no está conectado">
              datos de muestra
            </span>
          )}
          {email && (
            <span className={s.quien} title={email}>
              <span className={s.inicial} aria-hidden="true">
                {email[0]}
              </span>
              {email}
            </span>
          )}
          <ThemeToggle />
          <button
            className={s.chip}
            onClick={() => { clearSession(); navigate("/sign-in"); }}
          >
            Salir
          </button>
        </div>
      </header>

      <main className={s.body} id="contenido">
        <Outlet />
      </main>
    </div>
  );
}
