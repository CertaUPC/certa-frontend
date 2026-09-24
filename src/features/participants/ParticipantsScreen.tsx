/* Registrar a quien se sienta, y darle su código.
 *
 * Antes esta pantalla no escribía nada: el formulario añadía una fila a la
 * memoria del navegador y se perdía al recargar, preguntaba los años de
 * experiencia que el modelo ya no guarda, y adivinaba la banda por su cuenta.
 * Quien dirigía la sesión tenía que registrar al participante llamando a la
 * API a mano y emitirle la credencial en otra llamada.
 *
 * Ahora los dos pasos del protocolo, el alta y la credencial, son un gesto. El
 * orden de condiciones no se predice aquí: lo asigna el contrabalanceo del
 * servicio y se muestra el que devolvió.
 */

import { useMemo, useState, type FormEvent } from "react";
import { ApiError, api } from "../../shared/api";
import { PARTICIPANTS } from "../../shared/fixtures";
import { Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import s from "./ParticipantsScreen.module.css";

const CONDITION_LABEL: Record<string, string> = {
  con_asistente: "Con asistente",
  sin_asistente: "Control",
};

/* El vocabulario del anexo B, tal cual lo admite el servicio. Se declara aquí
   y no se inventa: una banda que el dominio no conozca se rechaza. */
const BANDAS = [
  { valor: "menos_de_1", rotulo: "Menos de 1 año" },
  { valor: "de_1_a_3", rotulo: "De 1 a 3 años" },
  { valor: "de_4_a_7", rotulo: "De 4 a 7 años" },
  { valor: "mas_de_7", rotulo: "Más de 7 años" },
];
const FRECUENCIAS = [
  { valor: "nunca", rotulo: "Nunca" },
  { valor: "alguna_vez", rotulo: "Alguna vez" },
  { valor: "mensual", rotulo: "Alguna vez al mes" },
  { valor: "semanal", rotulo: "Cada semana" },
  { valor: "diaria", rotulo: "A diario" },
];
const FORMACIONES = [
  { valor: "ninguna", rotulo: "Ninguna" },
  { valor: "autodidacta", rotulo: "Por mi cuenta" },
  { valor: "curso", rotulo: "Un curso formal" },
];

const BANDA_ROTULO = Object.fromEntries(BANDAS.map((b) => [b.valor, b.rotulo]));

interface Alta {
  codigo: string;
  order: string[];
  first_batch: string;
  second_batch: string;
  is_pilot: boolean;
  vence: string | null;
}

export function ParticipantsScreen() {
  const cargado = useApi(() => api.listParticipants(), PARTICIPANTS);
  const items = cargado.data ?? [];

  const [codigo, setCodigo] = useState("");
  const [banda, setBanda] = useState(BANDAS[1].valor);
  const [lenguaje, setLenguaje] = useState("");
  const [frecuencia, setFrecuencia] = useState("");
  const [formacion, setFormacion] = useState("");
  const [rolSeguridad, setRolSeguridad] = useState(false);
  const [piloto, setPiloto] = useState(true);
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alta, setAlta] = useState<Alta | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  /* Los pilotos no cuentan. El contrabalanceo del servicio tampoco los
     cuenta, de modo que dibujarlos aquí mostraría un desequilibrio que no
     existe y llevaría a corregir lo que ya está bien. */
  const delEstudio = useMemo(() => items.filter((p) => !p.is_pilot), [items]);
  const reparto = useMemo(() => {
    const primero = delEstudio.filter(
      (p) => p.order[0] === "con_asistente",
    ).length;
    return { primero, segundo: delEstudio.length - primero };
  }, [delEstudio]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAlta(null);

    if (!consentimiento) {
      setError("Sin consentimiento informado no se registra ningún dato.");
      return;
    }

    setTrabajando(true);
    try {
      const r = await api.registerParticipant({
        anonymous_code: codigo.trim().toUpperCase(),
        experience_band: banda,
        has_security_role: rolSeguridad,
        main_language: lenguaje.trim() || null,
        alert_frequency: frecuencia || null,
        security_training: formacion || null,
        consented: true,
        is_pilot: piloto,
      });

      /* La credencial se emite acto seguido. Sin ella el código no abre nada,
         y separarlo en dos gestos es cómo se olvida el segundo. */
      const grant = await api.issueParticipationGrant(r.participant_id);

      setAlta({
        codigo: codigo.trim().toUpperCase(),
        order: r.order,
        first_batch: r.first_batch,
        second_batch: r.second_batch,
        is_pilot: r.is_pilot,
        vence: grant.expires_at,
      });
      setCodigo("");
      setLenguaje("");
      setFrecuencia("");
      setFormacion("");
      setRolSeguridad(false);
      setConsentimiento(false);
      cargado.reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  if (cargado.loading) return <Loading what="los participantes" />;
  if (cargado.error)
    return <Failed message={cargado.error} onRetry={cargado.reload} />;

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
          <h2 className={s.h2}>Registrar a quien se sienta</h2>

          <label className={s.field}>
            <span>Código anónimo</span>
            <input
              className={s.codigo}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="P04"
              maxLength={20}
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
            <small>
              Es lo único que se guarda de la persona. Ni nombre, ni correo, ni
              dónde trabaja.
            </small>
          </label>

          <label className={s.field}>
            <span>Años programando</span>
            <select value={banda} onChange={(e) => setBanda(e.target.value)}>
              {BANDAS.map((b) => (
                <option key={b.valor} value={b.valor}>
                  {b.rotulo}
                </option>
              ))}
            </select>
            <small>Entra como factor de control en el análisis.</small>
          </label>

          <label className={s.field}>
            <span>Lenguaje principal</span>
            <input
              value={lenguaje}
              onChange={(e) => setLenguaje(e.target.value)}
              placeholder="Java"
              maxLength={40}
            />
          </label>

          <label className={s.field}>
            <span>Con qué frecuencia revisa alertas de seguridad</span>
            <select
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
            >
              <option value="">Sin responder</option>
              {FRECUENCIAS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className={s.field}>
            <span>Formación en seguridad</span>
            <select
              value={formacion}
              onChange={(e) => setFormacion(e.target.value)}
            >
              <option value="">Sin responder</option>
              {FORMACIONES.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={rolSeguridad}
              onChange={(e) => setRolSeguridad(e.target.checked)}
            />
            <span>
              Tiene un rol formal en seguridad de aplicaciones. El estudio los
              excluye, y marcarlo impide el alta.
            </span>
          </label>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={piloto}
              onChange={(e) => setPiloto(e.target.checked)}
            />
            <span>
              Es sesión piloto o ensayo. Queda fuera del análisis y del
              contrabalanceo, y no se puede añadir después.
            </span>
          </label>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
            />
            <span>
              Firmó el consentimiento informado y se le explicó que puede
              retirarse en cualquier momento sin consecuencia.
            </span>
          </label>

          <div role="alert" aria-live="assertive">
            {error && <p className={s.error}>{error}</p>}
          </div>

          <button className={s.submit} type="submit" disabled={trabajando} aria-busy={trabajando}>
            {trabajando ? "Registrando…" : "Registrar y emitir su credencial"}
          </button>
        </form>

        <div>
          {alta && <Dictado alta={alta} />}

          <div className={s.balance}>
            <h2 className={s.h2}>Reparto del orden</h2>
            <div className={s.bars}>
              <div>
                <span className={s.barLabel}>Empiezan con asistente</span>
                <span className={s.bar}>
                  <span
                    className={s.barFillA}
                    style={{
                      inlineSize: delEstudio.length
                        ? `${(reparto.primero / delEstudio.length) * 100}%`
                        : 0,
                    }}
                  />
                </span>
                <span className={`${s.barN} mono`}>{reparto.primero}</span>
              </div>
              <div>
                <span className={s.barLabel}>Empiezan por control</span>
                <span className={s.bar}>
                  <span
                    className={s.barFillB}
                    style={{
                      inlineSize: delEstudio.length
                        ? `${(reparto.segundo / delEstudio.length) * 100}%`
                        : 0,
                    }}
                  />
                </span>
                <span className={`${s.barN} mono`}>{reparto.segundo}</span>
              </div>
            </div>
            <p className={s.note}>
              {delEstudio.length === 0
                ? items.length === 0
                  ? "Todavía no hay nadie registrado."
                  : "Solo hay pilotos, y los pilotos no entran en el reparto."
                : Math.abs(reparto.primero - reparto.segundo) <= 1
                  ? "El reparto está equilibrado."
                  : "El reparto se ha desequilibrado. El siguiente registro lo corrige."}
            </p>
          </div>

          {items.length > 0 && (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Años programando</th>
                  <th>Empieza por</th>
                  <th>Mitades</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.participant_id}>
                    <td className="mono">{p.anonymous_code}</td>
                    <td>
                      {BANDA_ROTULO[p.experience_band] ?? p.experience_band}
                    </td>
                    <td>
                      <span
                        className={
                          p.order[0] === "con_asistente" ? s.tagA : s.tagB
                        }
                      >
                        {CONDITION_LABEL[p.order[0]] ?? "Sin asignar"}
                      </span>
                      {p.is_pilot && <span className={s.tagPiloto}>Piloto</span>}
                    </td>
                    <td className="mono">
                      {p.first_batch && p.second_batch
                        ? `${p.first_batch}, ${p.second_batch}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* Lo que hay que decirle en voz alta. El código grande porque se dicta, y la
   hora de vencimiento porque fuera de esa ventana no abre nada. */
function Dictado({ alta }: { alta: Alta }) {
  const vence = alta.vence
    ? new Date(alta.vence).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={s.dictado} role="status">
      <h2 className={s.h2}>Ya puede entrar</h2>
      <p className={s.dictadoLead}>
        Dile que abra la pantalla de entrada, elija «Participo en el estudio» y
        escriba este código.
      </p>
      <p className={s.dictadoCodigo}>{alta.codigo}</p>
      <dl className={s.dictadoDatos}>
        <div>
          <dt>Empieza por</dt>
          <dd>{CONDITION_LABEL[alta.order[0]] ?? alta.order[0]}</dd>
        </div>
        <div>
          <dt>Mitades</dt>
          <dd className="mono">
            {alta.first_batch}, luego {alta.second_batch}
          </dd>
        </div>
        {vence && (
          <div>
            <dt>Su credencial vence</dt>
            <dd>a las {vence}</dd>
          </div>
        )}
        {alta.is_pilot && (
          <div>
            <dt>Piloto</dt>
            <dd>Queda fuera del análisis y del contrabalanceo.</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
