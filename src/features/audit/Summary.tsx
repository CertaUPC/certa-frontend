/* Cierre de la sesión.
 *
 * Dice qué quedó registrado y ofrece la última corrección. No muestra aciertos:
 * saber el puntaje cambiaría cómo decide en la segunda condición.
 */

import { CHOICE_LABEL, type Choice } from "./shortcuts";
import { FINDINGS } from "./data";
import s from "./Summary.module.css";

interface Props {
  records: Record<string, { choice: Choice; seconds: number }>;
  onReview: () => void;
}

export function Summary({ records, onReview }: Props) {
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
          Quedaron registradas {total} de {FINDINGS.length} respuestas. Puedes
          volver y cambiar cualquiera antes de cerrar la sesión.
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

        <button className={s.back} onClick={onReview}>
          Volver a la lista
        </button>

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
