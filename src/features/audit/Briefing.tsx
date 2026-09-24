/* Instrucciones previas a la sesión.
 *
 * En pantalla y no de boca del investigador: así son idénticas para todos. Lo
 * único que cambia es la condición, porque no se le puede prometer un asistente
 * a quien no lo va a tener.
 */

import { useTheme } from "../../shared/theme";
import s from "./Briefing.module.css";

interface Props {
  assisted: boolean;
  total: number;
  onStart: () => void;
}

export function Briefing({ assisted, total, onStart }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className={s.wrap}>
      <div className={s.sheet}>
        <p className={s.wordmark}>Certa</p>

        <h1 className={s.title}>
          Vas a revisar {total} alertas de seguridad y decidir cuáles son reales
        </h1>

        <p className={s.lead}>
          Una herramienta de análisis revisó el código y marcó estos puntos como
          posibles vulnerabilidades. Muchas de esas marcas son falsas alarmas.
          Tu tarea es decidir, en cada una, si el problema existe de verdad.
        </p>

        <div className={s.steps}>
          <h2 className={s.h2}>Cómo funciona cada alerta</h2>
          <ol className={s.ol}>
            <li>
              <b>Lees el código.</b> Verás la función donde está la alerta y,
              cuando exista, quien la llama. Eso es todo el código disponible.
            </li>
            {assisted && (
              <li>
                <b>Lees lo que opina el asistente.</b> Te dice si le parece real,
                qué tan seguro está y en qué líneas se apoya. Esas líneas
                aparecen marcadas en el código.
              </li>
            )}
            <li>
              <b>Decides.</b> Si es real, si es falsa alarma, o que no estás
              seguro. No estar seguro es una respuesta válida y conviene usarla
              cuando de verdad lo estés.
            </li>
          </ol>
        </div>

        {assisted && (
          <div className={s.warn}>
            <p className={s.warnTitle}>El asistente se puede equivocar</p>
            <p className={s.warnBody}>
              No des su respuesta por buena. Por eso te muestra las líneas
              exactas en las que se apoya: para que las compruebes tú. Si lo que
              dice no cuadra con lo que ves, quien decide eres tú.
            </p>
          </div>
        )}

        <div className={s.keys}>
          <h2 className={s.h2}>Para responder</h2>
          <p className={s.keysBody}>
            Con el ratón, pulsa el botón que corresponda. Con el teclado,{" "}
            <kbd className={s.kbd}>1</kbd> <kbd className={s.kbd}>2</kbd>{" "}
            <kbd className={s.kbd}>3</kbd> eligen y{" "}
            <kbd className={s.kbd}>Enter</kbd> confirma. Hacen falta dos
            pulsaciones a propósito, para que un golpe involuntario no registre
            una respuesta que no querías. Siempre puedes corregir la anterior.
          </p>
        </div>

        {/* El tema se elige aquí y no durante la tarea: a partir de Empezar
            queda fijado, para que las dos condiciones se resuelvan sobre la
            misma presentación y la diferencia medida no recoja el cambio. */}
        <div className={s.look}>
          <span className={s.lookLabel}>Cómo se ve la pantalla</span>
          <button className={s.lookChip} onClick={toggle}>
            {theme === "dark" ? "Claro" : "Oscuro"}
          </button>
          <span className={s.lookNote}>
            Elígelo ahora. Al empezar queda fijo hasta el final.
          </span>
        </div>

        <button className={s.start} onClick={onStart} autoFocus>
          Empezar
        </button>

        <p className={s.foot}>
          No hay respuestas correctas que debas adivinar. Se mide cómo decides,
          no cuánto sabes.
        </p>
      </div>
    </div>
  );
}
