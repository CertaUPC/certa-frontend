/* El conmutador de tema, como icono.
 *
 * El texto «Cambiar a tema claro» ocupaba una línea entera en la barra y en la
 * entrada para una acción secundaria. El icono dice lo mismo en 32 píxeles, y
 * el nombre accesible queda en `aria-label`, que es donde un lector de pantalla
 * lo busca.
 */

import { useTheme } from "./theme";
import s from "./ThemeToggle.module.css";

interface Props {
  /** Sobre el panel oscuro de la entrada el icono va en su propia tinta. */
  sobreOscuro?: boolean;
}

export function ThemeToggle({ sobreOscuro = false }: Props) {
  const { theme, toggle, locked } = useTheme();
  const aClaro = theme === "dark";

  const motivo = locked
    ? "El tema quedó fijado al empezar la sesión: cambiarlo a mitad alteraría la comparación entre las dos condiciones."
    : undefined;

  return (
    <button
      type="button"
      className={sobreOscuro ? s.sobreOscuro : s.boton}
      onClick={toggle}
      disabled={locked}
      title={motivo}
      aria-label={aClaro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {aClaro ? <Sol /> : <Luna />}
    </button>
  );
}

function Sol() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.6v2.1M12 19.3v2.1M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" />
      </g>
    </svg>
  );
}

function Luna() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M20.3 14.2A8.6 8.6 0 0 1 9.8 3.7a8.6 8.6 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
