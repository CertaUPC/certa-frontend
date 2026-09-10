import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../shared/api";
import { PARTICIPANTS } from "../../shared/fixtures";
import { Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import type { Participant } from "../../shared/api";
import s from "./ParticipantsScreen.module.css";

const CONDITION_LABEL: Record<string, string> = {
  con_asistente: "Con asistente",
  sin_asistente: "Control",
};

export function ParticipantsScreen() {
  const loaded = useApi(() => api.listParticipants(), PARTICIPANTS);
  const [extra, setExtra] = useState<Participant[]>([]);
  const items = useMemo(() => [...(loaded.data ?? []), ...extra], [loaded.data, extra]);
  const [code, setCode] = useState("");
  const [years, setYears] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* El reparto se deriva del historial, así que la asignación es reproducible:
     dos ejecuciones sobre los mismos datos dan el mismo orden. */
  const balance = useMemo(() => {
    const primero = items.filter((p) => p.order[0] === "con_asistente").length;
    return { primero, segundo: items.length - primero };
  }, [items]);

  const nextOrder: string[] =
    balance.primero <= balance.segundo
      ? ["con_asistente", "sin_asistente"]
      : ["sin_asistente", "con_asistente"];

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Sin consentimiento informado no se registra ningún dato.");
      return;
    }
    if (items.some((p) => p.anonymous_code === code.trim())) {
      setError(`Ya existe un participante con el código ${code.trim()}.`);
      return;
    }
    const n = Number(years);
    if (!Number.isFinite(n) || n < 0) {
      setError("Los años de experiencia deben ser un número positivo.");
      return;
    }

    setExtra((prev) => [
      ...prev,
      {
        participant_id: crypto.randomUUID(),
        anonymous_code: code.trim(),
        experience_band: n < 2 ? "inicial" : n < 5 ? "intermedio" : "senior",
        order: nextOrder,
        first_batch: "A",
        second_batch: "B",
      },
    ]);
    setCode("");
    setYears("");
    setConsent(false);
  }

  if (loaded.loading) return <Loading what="los participantes" />;
  if (loaded.error) return <Failed message={loaded.error} onRetry={loaded.reload} />;

  return (
    <>
      <h1 className={s.title}>Participantes</h1>
      <p className={s.lead}>
        Cada participante resuelve las dos condiciones y actúa como su propio
        control. El orden se reparte de forma equilibrada para que el efecto de
        haber practicado en la primera no se confunda con el efecto del
        asistente.
      </p>

      <div className={s.cols}>
        <form className={s.form} onSubmit={submit}>
          <h2 className={s.h2}>Registrar</h2>

          <label className={s.field}>
            <span>Código anónimo</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="P04"
              maxLength={20}
              required
            />
            <small>No se guarda nombre ni correo. El análisis nunca necesita la identidad.</small>
          </label>

          <label className={s.field}>
            <span>Años de experiencia</span>
            <input
              type="number"
              min={0}
              max={60}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              required
            />
            <small>Entra como factor en el análisis, para poder controlarlo.</small>
          </label>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Firmó el consentimiento informado y se le explicó que puede
              retirarse en cualquier momento sin consecuencia.
            </span>
          </label>

          <p className={s.assign}>
            Le tocará empezar por{" "}
            <b>{CONDITION_LABEL[nextOrder[0]]}</b>, para mantener el reparto
            equilibrado.
          </p>

          {error && <p className={s.error}>{error}</p>}

          <button className={s.submit} type="submit">Registrar y asignar</button>
        </form>

        <div>
          <div className={s.balance}>
            <h2 className={s.h2}>Reparto del orden</h2>
            <div className={s.bars}>
              <div>
                <span className={s.barLabel}>Empiezan con asistente</span>
                <span className={s.bar}>
                  <span
                    className={s.barFillA}
                    style={{ inlineSize: items.length ? `${(balance.primero / items.length) * 100}%` : 0 }}
                  />
                </span>
                <span className={`${s.barN} mono`}>{balance.primero}</span>
              </div>
              <div>
                <span className={s.barLabel}>Empiezan por control</span>
                <span className={s.bar}>
                  <span
                    className={s.barFillB}
                    style={{ inlineSize: items.length ? `${(balance.segundo / items.length) * 100}%` : 0 }}
                  />
                </span>
                <span className={`${s.barN} mono`}>{balance.segundo}</span>
              </div>
            </div>
            <p className={s.note}>
              {Math.abs(balance.primero - balance.segundo) <= 1
                ? "El reparto está equilibrado."
                : "El reparto se ha desequilibrado. El siguiente registro lo corrige."}
            </p>
          </div>

          <table className={s.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Experiencia</th>
                <th>Empieza por</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.participant_id}>
                  <td className="mono">{p.anonymous_code}</td>
                  <td>{p.experience_band}</td>
                  <td>
                    <span className={p.order[0] === "con_asistente" ? s.tagA : s.tagB}>
                      {CONDITION_LABEL[p.order[0]]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
