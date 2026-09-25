/* Armazón de las pantallas del equipo.
 *
 * La auditoría no lo usa: quien participa no debe ver navegación, ni
 * ejecuciones ajenas, ni métricas. Solo la tarea que se le pidió.
 *
 * La navegación va en columna y no en fila. En horizontal solo caben rótulos;
 * en vertical caben el desplegable de proyectos, las ejecuciones del que esté
 * elegido y las acciones que se lanzan sobre él, que es lo que convierte la
 * navegación en el sitio desde donde se trabaja.
 */

import { Outlet } from "react-router-dom";
import { ProjectProvider } from "./project";
import { SideNav } from "./SideNav";
import s from "./AppShell.module.css";

export function AppShell() {
  return (
    <ProjectProvider>
      <div className={s.shell}>
        {/* Con el desplegable y las acciones en la barra, tabular hasta el
            contenido son muchos saltos en cada pantalla. */}
        <a className={s.salto} href="#contenido">
          Saltar al contenido
        </a>

        <SideNav />

        <main className={s.body} id="contenido">
          <div className={s.dentro}>
            <Outlet />
          </div>
        </main>
      </div>
    </ProjectProvider>
  );
}
