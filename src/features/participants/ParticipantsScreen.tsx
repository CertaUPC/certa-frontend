/* La pantalla de quien dirige la sesión. El participante no la ve nunca.
 *
 * Antes no escribía nada: el formulario añadía una fila a la memoria del
 * navegador y se perdía al recargar, preguntaba los años de experiencia que el
 * modelo ya no guarda, y adivinaba la banda por su cuenta. Había que dar de
 * alta a la persona llamando a la API a mano y habilitarle el acceso en otra
 * llamada.
 *
 * Ahora el alta y la habilitación son un gesto. El orden de condiciones no se
 * predice aquí: lo asigna el contrabalanceo del servicio y se muestra el que
 * devolvió.
 */

import { useMemo, useState, type FormEvent } from "react";
import { ApiError, api } from "../../shared/api";
import { PARTICIPANTS } from "../../shared/fixtures";
import { Hint } from "../../shared/Hint";
import { Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import s from "./ParticipantsScreen.module.css";

/* «Control» es la palabra del método y no dice nada a quien no lo conoce.
   Lo que la persona hace es revisar sin el asistente, y así se rotula. */
const CONDITION_LABEL: Record<string, string> = {
  con_asistente: "Con asistente",
  sin_asistente: "Sin asistente",
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
  /* Venía marcada. Quien no se fijara daba de alta a una persona del estudio
     como ensayo, y un piloto no entra en el análisis ni se puede convertir
     después. Va desmarcada y se marca a propósito. */
  const [piloto, setPiloto] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alta, setAlta] = useState<Alta | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  /* Quién está siendo rehabilitado, para apagar solo su botón. */
  const [habilitando, setHabilitando] = useState<string | null>(null);

  /* Una credencial vence en doce horas, así que una sesión que se corre de
     día deja a alguien fuera sin que nadie haya hecho nada mal. Rehabilitarlo
     es emitirle otra: no altera su reparto ni sus respuestas. */
  async function habilitar(participantId: string) {
    setError(null);
    setHabilitando(participantId);
    try {
      await api.issueParticipationGrant(participantId);
      cargado.reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo contactar al servicio.",
      );
    } finally {
      setHabilitando(null);
    }
  }

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

      setAlta({
        /* El que devolvió el servicio y no el que se tecleó: «P04» se guarda
           como «P-04», y lo que hay que dictar es lo guardado. */
        codigo: r.anonymous_code,
        order: r.order,
        first_batch: r.first_batch,
        second_batch: r.second_batch,
        is_pilot: r.is_pilot,
        vence: r.access_expires_at,
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
      <h1 className={s.title}>Gestionar participantes</h1>
      <p className={s.lead}>
        Registrarlo y habilitarle el acceso son el mismo gesto.
      </p>

      <div className={s.cols}>
        <form className={s.form} onSubmit={submit}>
          <h2 className={s.h2}>Registrar un participante</h2>

          <label className={s.field}>
            <span>Código anónimo</span>
            <input
              className={s.codigo}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="P-04"
              maxLength={20}
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
            <small>
              El de su acta de consentimiento, con guion. Es lo único que se
              guarda de la persona.
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
            <small>Sirve para comparar a gente con experiencia parecida.</small>
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
              Trabaja formalmente en seguridad: marcarlo impide el alta, porque
              el estudio no los incluye.
            </span>
          </label>

          {/* La ayuda va fuera de la etiqueta y no dentro: dentro, pulsarla
              marcaría la casilla sin querer. */}
          <div className={`${s.check} ${s.checkInline}`}>
            <input
              id="piloto"
              type="checkbox"
              checked={piloto}
              onChange={(e) => setPiloto(e.target.checked)}
            />
            <label htmlFor="piloto">Es una sesión piloto</label>
            <Hint termino="sesión piloto">
              Un ensayo antes del estudio. No entra en el análisis ni en el
              reparto del orden, y eso no se puede cambiar después.
            </Hint>
          </div>

          <label className={s.check}>
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
            />
            <span>
              Firmó el consentimiento y sabe que puede retirarse cuando quiera,
              sin consecuencia.
            </span>
          </label>

          <div role="alert" aria-live="assertive">
            {error && <p className={s.error}>{error}</p>}
          </div>

          {/* El botón espera al consentimiento en vez de aceptarlo y reñir
              después: en un estudio con personas ese es el orden. */}
          <button
            className={s.submit}
            type="submit"
            disabled={trabajando || !consentimiento}
            aria-busy={trabajando}
          >
            {trabajando ? "Registrando…" : "Registrar y habilitar su acceso"}
          </button>
          {!consentimiento && (
            <p className={s.porQue}>
              Falta marcar que firmó el consentimiento.
            </p>
          )}
        </form>

        <div>
          {alta && <Dictado alta={alta} />}

          <div className={s.balance}>
            <h2 className={s.h2}>
              Reparto del orden
              <Hint termino="contrabalanceo">
                Su nombre técnico es contrabalanceo. La mitad empieza con el
                asistente y la otra mitad sin él, para no confundir lo que
                aporta el asistente con lo que aporta haber practicado antes.
              </Hint>
            </h2>
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
                <span className={s.barLabel}>Empiezan sin asistente</span>
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
                  <th>Empieza</th>
                  <th>
                    Acceso
                    <Hint termino="el acceso del participante">
                      Con su código entra a su sesión mientras la credencial
                      siga vigente, y dura doce horas. Si venció o se revocó,
                      aquí mismo se le emite otra: no cambia su reparto ni lo
                      que haya respondido.
                    </Hint>
                  </th>
                  <th>
                    Tandas
                    <Hint termino="las tandas A y B">
                      Las alertas se reparten en dos tandas iguales, A y B.
                      Cada persona resuelve una con el asistente y la otra sin
                      él, y el orden se alterna entre participantes para que
                      haber practicado en la primera no se confunda con el
                      efecto del asistente.
                    </Hint>
                  </th>
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
                    <td>
                      {p.puede_entrar ? (
                        <span className={s.puedeEntrar}>
                          Puede entrar
                          {p.access_expires_at && (
                            <span className={s.hasta}>
                              hasta las {hora(p.access_expires_at)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={s.sinAcceso}>
                          Sin acceso
                          <button
                            type="button"
                            className={s.habilitar}
                            disabled={habilitando === p.participant_id}
                            onClick={() => habilitar(p.participant_id)}
                          >
                            {habilitando === p.participant_id
                              ? "Habilitando…"
                              : "Habilitar"}
                          </button>
                        </span>
                      )}
                    </td>
                    <td className="mono">
                      {p.first_batch && p.second_batch
                        ? `${p.first_batch}, ${p.second_batch}`
                        : "sin asignar"}
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

/** La hora a secas, que es lo que se dice en voz alta: «hasta las 2:40». */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
        Dile que abra la pantalla de entrada, elija «Participante del estudio»
        y escriba este código.
      </p>
      <p className={s.dictadoCodigo}>{alta.codigo}</p>
      <dl className={s.dictadoDatos}>
        <div>
          <dt>Empieza por</dt>
          <dd>{CONDITION_LABEL[alta.order[0]] ?? alta.order[0]}</dd>
        </div>
        <div>
          <dt>Tandas</dt>
          <dd className="mono">
            {alta.first_batch}, luego {alta.second_batch}
          </dd>
        </div>
        {vence && (
          <div>
            <dt>Su acceso vence</dt>
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
