/* Armazón de las pantallas de investigación.
 *
 * La auditoría no lo usa: quien participa no debe ver navegación, ni
 * ejecuciones ajenas, ni métricas. Solo la tarea que se le pidió.
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { USE_FIXTURES, clearSession, getRole, ROLE_LABEL } from "./api";
import { useTheme } from "./theme";
import s from "./AppShell.module.css";

const NAV = [
  { to: "/executions", label: "Ejecuciones" },
  { to: "/participants", label: "Participantes" },
];

export function AppShell() {
  const navigate = useNavigate();
  const { theme, toggle, locked } = useTheme();
  const role = getRole();

  return (
    <div className={s.shell}>
      <header className={s.top}>
        <span className={s.wordmark}>Certa</span>

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
          {role && <span className={s.role}>{ROLE_LABEL[role]}</span>}
          <button className={s.chip} onClick={toggle} disabled={locked}>
            {theme === "dark" ? "Claro" : "Oscuro"}
          </button>
          <button
            className={s.chip}
            onClick={() => { clearSession(); navigate("/sign-in"); }}
          >
            Salir
          </button>
        </div>
      </header>

      <main className={s.body}>
        <Outlet />
      </main>
    </div>
  );
}
