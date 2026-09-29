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
 *
 * El globo se coloca respecto de la ventana y no de su contenedor. Colgado del
 * contenedor, cualquier caja que recorte lo que sobra se lo comía: en la tabla
 * de participantes, cuya única razón para recortar es redondear sus esquinas,
 * la explicación de la cabecera salía por encima de la primera fila y no se
 * veía ni un pixel de ella. Medido contra la ventana, además, se puede voltear
 * hacia abajo cuando arriba no cabe y arrimar cuando toca un borde.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import s from "./Hint.module.css";

interface Props {
  /** El término que se explica. Va en el nombre accesible del botón. */
  termino: string;
  children: React.ReactNode;
}

/** Separación entre el globo y el botón, y respeto a los bordes de la ventana. */
const HOLGURA = 6;
const MARGEN = 8;

export function Hint({ termino, children }: Props) {
  const id = useId();
  const [rondando, setRondando] = useState(false);
  const [fijo, setFijo] = useState(false);
  const [sitio, setSitio] = useState<{ top: number; left: number } | null>(null);

  const caja = useRef<HTMLSpanElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const globo = useRef<HTMLSpanElement>(null);

  const visible = rondando || fijo;

  const colocar = useCallback(() => {
    const b = boton.current?.getBoundingClientRect();
    const g = globo.current?.getBoundingClientRect();
    if (!b || !g) return;
    /* Arriba por costumbre, porque el término queda debajo y no se tapa. Si no
       cabe, debajo: media explicación asomando es lo mismo que ninguna. */
    const cabeArriba = b.top - g.height - HOLGURA >= MARGEN;
    const top = cabeArriba ? b.top - g.height - HOLGURA : b.bottom + HOLGURA;
    const mitad = g.width / 2;
    const left = Math.min(
      Math.max(b.left + b.width / 2, MARGEN + mitad),
      window.innerWidth - MARGEN - mitad,
    );
    setSitio({ top, left });
  }, []);

  /* Antes de pintar: si se calculara después, el globo aparecería un cuadro en
     el sitio de la vez anterior. */
  useLayoutEffect(() => {
    if (visible) colocar();
  }, [visible, colocar]);

  useEffect(() => {
    if (!visible) return;
    const seguir = () => colocar();
    // En captura, porque quien se desplaza suele ser un panel y no la ventana.
    window.addEventListener("scroll", seguir, true);
    window.addEventListener("resize", seguir);
    return () => {
      window.removeEventListener("scroll", seguir, true);
      window.removeEventListener("resize", seguir);
    };
  }, [visible, colocar]);

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
    <span
      className={s.caja}
      ref={caja}
      onPointerEnter={() => setRondando(true)}
      onPointerLeave={() => setRondando(false)}
      onFocus={() => setRondando(true)}
      onBlur={() => setRondando(false)}
    >
      <button
        ref={boton}
        type="button"
        className={s.boton}
        aria-label={`Qué significa ${termino}`}
        aria-describedby={id}
        aria-expanded={fijo}
        data-abierto={visible || undefined}
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
      {/* Siempre en el árbol, aunque no se vea: `aria-describedby` lo lee igual,
          de modo que quien no ve el globo recibe la misma explicación. */}
      <span
        ref={globo}
        className={s.globo}
        id={id}
        role="tooltip"
        data-visible={visible || undefined}
        data-fijo={fijo || undefined}
        style={sitio ? { top: sitio.top, left: sitio.left } : undefined}
      >
        {children}
      </span>
    </span>
  );
}
