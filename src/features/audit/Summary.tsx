/* Cierre de la sesión.
 *
 * Dice qué quedó registrado y ofrece la última corrección. No muestra aciertos:
 * saber el puntaje cambiaría cómo decide en la segunda condición.
 */

import { CHOICE_LABEL, type Choice } from "./shortcuts";
import s from "./Summary.module.css";

interface Props {
  records: Record<string, { choice: Choice; seconds: number }>;
  /** Cuantas alertas traia esta mitad, no cuantas se respondieron. */
  total: number;
  onReview: () => void;
  /** Presente solo cuando queda una segunda condicion por recorrer. */
  onContinue?: () => void;
}

export function Summary({ records, total: esperadas, onReview, onContinue }: Props) {
  const entries = Object.values(records);
  const total = entries.length;
  const seconds = entries.reduce((a, r) => a + r.seconds, 0);
  const median = (() => {
    if (!total) return 0;
    const orden = entries.map((r) => r.seconds).sort((a, b) => a - b);
    const m = Math.floor(orden.length / 2);
    return orden.length % 2 ? orden[m] : (orden[m - 1] + orden[m]) / 2;
  })();

  const counts = (["real", "falsa", "duda"] as Choice[]).map((c) => ({
    choice: c,
    n: entries.filter((r) => r.choice === c).length,
  }));

  return (
    <div className={s.wrap}>
      <div className={s.sheet}>
        <p className={s.wordmark}>Certa</p>
        <h1 className={s.title}>Terminaste la revisión</h1>
        <p className={s.lead}>
          Quedaron registradas {total} de {esperadas} respuestas. Puedes volver
          y cambiar cualquiera antes de continuar.
        </p>

        <dl className={s.facts}>
          <div>
            <dt>Tiempo total</dt>
            <dd className="mono">{formatMinutes(seconds)}</dd>
          </div>
          <div>
            <dt>Mediana por alerta</dt>
            <dd className="mono">{median.toFixed(1)} s</dd>
          </div>
        </dl>

        <div className={s.breakdown}>
          <h2 className={s.h2}>Cómo respondiste</h2>
          <ul className={s.ul}>
            {counts.map(({ choice, n }) => (
              <li key={choice}>
                <span className={s.label}>{CHOICE_LABEL[choice]}</span>
                <span className={s.bar} aria-hidden="true">
                  <span
                    className={s[`bar_${choice}`]}
                    style={{ inlineSize: total ? `${(n / total) * 100}%` : 0 }}
                  />
                </span>
                <span className={`${s.n} mono`}>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={s.actions}>
          <button className={s.back} onClick={onReview}>
            Volver a la lista
          </button>
          {onContinue && (
            <button className={s.next} onClick={onContinue}>
              Continuar con la segunda parte
            </button>
          )}
        </div>

        <p className={s.foot}>
          No se muestra qué acertaste. Saberlo cambiaría cómo decides en la
          segunda parte, y eso alteraría lo que el estudio mide.
        </p>
      </div>
    </div>
  );
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s2 = Math.round(seconds % 60);
  return m ? `${m} min ${s2} s` : `${s2} s`;
}
