/* Instrucciones previas a la sesión.
 *
 * En pantalla y no de boca del investigador: así son idénticas para todos. Lo
 * único que cambia es la condición, porque no se le puede prometer un asistente
 * a quien no lo va a tener.
 *
 * Cabe en una ventana. Antes era una columna de 660 píxeles con titular grande,
 * párrafo de entrada, lista numerada, recuadro de aviso, recuadro de teclas,
 * selector de tema, botón y una línea de cierre tranquilizadora, todo apilado:
 * había que desplazar para llegar al botón de empezar. Quien dirige la sesión
 * no puede quedarse comprobando que cada participante bajó hasta el final.
 */

import { useTheme } from "../../shared/theme";
import { Mark } from "../../shared/Mark";
import s from "./Briefing.module.css";

interface Props {
  assisted: boolean;
  total: number;
  onStart: () => void;
  /** Sesión del estudio, con su condición fijada de antemano. */
  medida: boolean;
}

export function Briefing({ assisted, total, onStart, medida }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className={s.wrap}>
      <div className={s.sheet}>
        <header className={s.top}>
          <span className={s.brand}>
            <Mark size={19} className={s.brandMark} />
            <span className={s.wordmark}>Certa</span>
          </span>
          <span className={s.look}>
            {/* El tema queda fijado solo dentro del experimento, para que la
                presentación no cambie a mitad de la tarea medida. Fuera de él
                no se fija nada, así que anunciarlo era decir algo falso. */}
            {medida && (
              <span className={s.lookLabel}>Cómo se ve la pantalla</span>
            )}
            <button type="button" className={s.lookChip} onClick={toggle}>
              {theme === "dark" ? "Claro" : "Oscuro"}
            </button>
            {medida && (
              <span className={s.lookNote}>
                Al empezar queda fijo hasta el final.
              </span>
            )}
          </span>
        </header>

        <h1 className={s.title}>
          Vas a revisar {total} alertas de seguridad y decidir cuáles son reales
        </h1>

        <p className={s.lead}>
          Una herramienta de análisis revisó el código y marcó estos puntos como
          posibles vulnerabilidades. Muchas de esas marcas son falsas alarmas.
          Tu tarea es decidir, en cada una, si el problema existe de verdad.
        </p>

        <div className={s.cols}>
          <section>
            <h2 className={s.h2}>En cada alerta</h2>
            <ol className={s.ol}>
              <li>
                <b>Lees el código.</b> Verás la función donde está la alerta y,
                cuando exista, quien la llama. Eso es todo el código disponible.
              </li>
              {assisted && (
                <li>
                  <b>Lees lo que opina el asistente.</b> Si le parece real, qué
                  tan seguro está y en qué líneas se apoya. Esas líneas aparecen
                  marcadas en el código.
                </li>
              )}
              <li>
                <b>Decides.</b> Si es real, si es falsa alarma, o que no estás
                seguro. No estar seguro es una respuesta válida y conviene
                usarla cuando de verdad lo estés.
              </li>
            </ol>
          </section>

          <section>
            <h2 className={s.h2}>Para responder</h2>
            <p className={s.keysBody}>
              Con el ratón, pulsa el botón que corresponda. Con el teclado,{" "}
              <kbd className={s.kbd}>1</kbd> <kbd className={s.kbd}>2</kbd>{" "}
              <kbd className={s.kbd}>3</kbd> eligen y{" "}
              <kbd className={s.kbd}>Enter</kbd> confirma.
            </p>
            <p className={s.keysBody}>
              Hacen falta dos pulsaciones a propósito, para que un golpe
              involuntario no registre una respuesta que no querías. Siempre
              puedes corregir la anterior.
            </p>
          </section>
        </div>

        {assisted && (
          <p className={s.warn}>
            <b>El asistente se puede equivocar.</b> No des su respuesta por
            buena. Por eso te muestra las líneas exactas en las que se apoya:
            para que las compruebes tú. Si lo que dice no cuadra con lo que ves,
            quien decide eres tú.
          </p>
        )}

        <footer className={s.bottom}>
          <button className={s.start} onClick={onStart} autoFocus>
            Empezar
          </button>
          <p className={s.foot}>
            No hay respuestas correctas que debas adivinar. Se mide cómo
            decides, no cuánto sabes.
          </p>
        </footer>
      </div>
    </div>
  );
}
