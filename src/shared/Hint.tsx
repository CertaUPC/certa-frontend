/* Una explicación al alcance del cursor, junto al término que la necesita.
 *
 * «F1», «exhaustividad» o «anclaje a la primera» son vocabulario de quien mide,
 * no de quien revisa alertas. Escribirlos sin explicarlos deja la pantalla
 * legible solo para quien ya sabe, y poner la definición entera al lado de cada
 * número llenaría el panel de texto que estorba al que sí sabe.
 *
 * Se abre al pasar el cursor y al recibir el foco, de modo que llegar con el
 * teclado enseña lo mismo que llegar con el ratón. Con un toque se fija, que es
 * la única forma de leerla en una pantalla sin cursor.
 */

import { useEffect, useId, useRef, useState } from "react";
import s from "./Hint.module.css";

interface Props {
  /** El término que se explica. Va en el nombre accesible del botón. */
  termino: string;
  children: React.ReactNode;
}

export function Hint({ termino, children }: Props) {
  const id = useId();
  const [fijo, setFijo] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!fijo) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setFijo(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFijo(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [fijo]);

  return (
    <span className={s.caja} ref={caja} data-fijo={fijo || undefined}>
      <button
        type="button"
        className={s.boton}
        aria-label={`Qué significa ${termino}`}
        aria-describedby={id}
        aria-expanded={fijo}
        onClick={() => setFijo((f) => !f)}
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 7.2v3.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
        </svg>
      </button>
      <span className={s.globo} id={id} role="tooltip">
        {children}
      </span>
    </span>
  );
}
