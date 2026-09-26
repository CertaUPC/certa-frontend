/* Los pocos dibujos que dicen algo, en un solo sitio.
 *
 * No son adorno: cada uno va pegado a una palabra que cuesta distinguir de
 * otra parecida cuando la lista es larga. El estado de una corrida y el
 * desenlace de una alerta son las dos cosas que se leen de reojo, y ahí una
 * forma se reconoce antes que un texto.
 *
 * Todos comparten trazo y caja para que juntos no parezcan recortados de
 * sitios distintos, y ninguno lleva color propio: heredan el del texto al que
 * acompañan, de modo que el significado sigue viviendo en la palabra.
 */

export type Figura =
  | "terminada"
  | "procesando"
  | "detenida"
  | "espera"
  | "fallida"
  | "real"
  | "descartada"
  | "duda"
  | "cola"
  | "carpeta";

const TRAZOS: Record<Figura, string> = {
  // Visto: terminó y no queda nada por hacer.
  terminada: "M3.2 8.4l3.2 3.2 6.4-6.8",
  // Dos flechas en círculo: sigue dando vueltas.
  procesando: "M13 8a5 5 0 1 1-1.8-3.9M13 2.6V5h-2.4",
  // Pausa: alguien la tomó y ahí se quedó.
  detenida: "M6.2 4.6v6.8M9.8 4.6v6.8",
  // Reloj: espera su turno.
  espera: "M8 4.4V8l2.4 1.6M14 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z",
  // Aviso: se cortó por algo que hay que mirar.
  fallida: "M8 5.2v3.4M8 11.2h.01M8 2.4l6 10.4H2z",
  // Bandera: esta hay que atenderla.
  real: "M4.4 13.4V3.2M4.4 3.6h7.2l-1.6 2.6 1.6 2.6H4.4",
  // Visto en círculo: mirada y descartada.
  descartada: "M5.4 8.2l1.8 1.8 3.4-3.8M14 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z",
  // Interrogación: no alcanzó para decidir.
  duda: "M6.2 6.1a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.7-.8 1.2v.4M8 11.8h.01M14 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z",
  // Fila de espera.
  cola: "M2.8 4.6h10.4M2.8 8h6.8M2.8 11.4h4",
  // Carpeta: la ruta del repositorio.
  carpeta: "M2.6 4.8h4L7.8 6.4h5.6v6.2H2.6z",
};

interface Props {
  figura: Figura;
  /** Tamaño en píxeles. Por defecto el del texto que acompaña. */
  tam?: number;
  className?: string;
}

export function Glyph({ figura, tam = 13, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width={tam}
      height={tam}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={TRAZOS[figura]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
