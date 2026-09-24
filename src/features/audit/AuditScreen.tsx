import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefing } from "./Briefing";
import { CodeViewer } from "./CodeViewer";
import { ShortcutHelp } from "./ShortcutHelp";
import { Summary } from "./Summary";
import { warmUp } from "./highlight";
import {
  CHOICE_KEY,
  CHOICE_LABEL,
  CHOICE_PAST,
  toIntent,
  type Choice,
} from "./shortcuts";
import {
  FINDINGS,
  VERDICT_LABEL,
  VERDICT_SHORT,
  confidenceWord,
  type Finding,
} from "./data";
import { toFinding } from "./adapter";
import { FindingFilters, NO_FILTERS, isFiltering, type Filters } from "./FindingFilters";
import { useTheme } from "../../shared/theme";
import { ThemeToggle } from "../../shared/ThemeToggle";
import { api, USE_FIXTURES, type ApiContext } from "../../shared/api";
import { Empty, Failed, Loading } from "../../shared/States";
import s from "./AuditScreen.module.css";

type Stage = "briefing" | "review" | "summary";

export interface Record_ {
  choice: Choice;
  seconds: number;
}


/* Cuantos contextos se piden a la vez. Seis mantiene la conexion ocupada sin
   que el navegador abra miles de peticiones en paralelo. */
const A_LA_VEZ = 6;

const CONDITION: Record<string, boolean> = {
  con_asistente: true,
  sin_asistente: false,
};

const VALUE: Record<Choice, "confirmado" | "descartado" | "dudoso"> = {
  real: "confirmado",
  falsa: "descartado",
  duda: "dudoso",
};

/* La ejecución, el participante y la condición llegan por la dirección: es el
   enlace que el investigador arma al preparar la sesión, y así el participante
   no elige nada de lo que se está midiendo. */
export function AuditScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const executionId = params.get("execution");
  const participantId = params.get("participant");
  const condicion = params.get("condition");
  const lote = params.get("batch");
  const siguienteCondicion = params.get("next_condition");
  const siguienteLote = params.get("next_batch");
  const fixedCondition = condicion ? CONDITION[condicion] ?? null : null;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loading, setLoading] = useState(!USE_FIXTURES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_FIXTURES || !executionId) return;
    let vigente = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const crudos = await api.findings(executionId);
        /* El lote se aplica antes de pedir contextos, y no después: son una
           petición por hallazgo, y sobre la ejecución entera serían miles. */
        let elegidos = crudos;
        if (lote) {
          const { hallazgos } = await api.batchFindings(lote);
          const orden = new Map(hallazgos.map((id, i) => [id, i]));
          elegidos = crudos
            .filter((f) => orden.has(f.id))
            .sort((a, b) => orden.get(a.id)! - orden.get(b.id)!);
          if (elegidos.length !== hallazgos.length) {
            throw new Error("el lote no cuadra con la ejecución");
          }
        }
        /* El contexto va en una petición por hallazgo. Fuera del estudio la
           lista es la ejecución entera, y pedirlas todas de golpe tumbaba el
           navegador con ERR_INSUFFICIENT_RESOURCES antes de pintar nada.

           Así que primero se pinta la lista sin contexto, que ya deja
           trabajar, y los contextos entran por tandas detrás. */
        if (!vigente) return;
        setFindings(elegidos.map((f) => toFinding(f, null)));
        setLoading(false);

        for (let i = 0; i < elegidos.length; i += A_LA_VEZ) {
          if (!vigente) return;
          const tanda = elegidos.slice(i, i + A_LA_VEZ);
          const contextos = await Promise.all(
            tanda.map((f) =>
              api.context(f.id).catch((): ApiContext | null => null),
            ),
          );
          if (!vigente) return;
          setFindings((previo) => {
            if (!previo) return previo;
            const copia = [...previo];
            tanda.forEach((f, j) => {
              const ctx = contextos[j];
              if (ctx) copia[i + j] = toFinding(f, ctx);
            });
            return copia;
          });
        }
      } catch {
        if (vigente) {
          setError(
            "No se pudieron cargar las alertas. Comprueba que el servicio esté " +
              "levantado, que la ejecución exista y que el lote esté cargado.",
          );
        }
      } finally {
        if (vigente) setLoading(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [executionId, lote]);

  const onAnswer = useCallback(
    (findingId: string, choice: Choice, seconds: number) => {
      if (USE_FIXTURES || !participantId || !condicion) return;
      api
        .decide({
          finding_id: findingId,
          participant_id: participantId,
          value: VALUE[choice],
          seconds,
          condition: condicion as "con_asistente" | "sin_asistente",
        })
        .then(() => setSaveError(null))
        .catch(() =>
          setSaveError(
            "La última respuesta no llegó al servidor. Sigue revisando: al " +
              "terminar avisa para no perderla.",
          ),
        );
    },
    [participantId, condicion],
  );

  if (USE_FIXTURES) {
    return <Session findings={FINDINGS} fixedCondition={fixedCondition} />;
  }
  if (!executionId) {
    return (
      <Empty title="Esta sesión no tiene ejecución asignada">
        <p>
          El enlace debe traer la ejecución que toca revisar. Pídeselo a quien
          prepara la sesión.
        </p>
      </Empty>
    );
  }
  if (loading) return <Loading what="las alertas" />;
  if (error) return <Failed message={error} />;
  if (!findings || findings.length === 0) {
    return (
      <Empty title="Esta ejecución no tiene alertas">
        <p>El archivo se cargó, pero el filtro de alcance no dejó ninguna.</p>
      </Empty>
    );
  }

  return (
    <Session
      findings={findings}
      onAnswer={onAnswer}
      fixedCondition={fixedCondition}
      onThemeFixed={(tema) => {
        if (!participantId) return;
        api.recordTheme(participantId, tema).catch(() => {
          /* No interrumpe la sesión: el dato es un control del análisis, no
             parte de la tarea. Si falta, se nota al analizar y se declara. */
        });
      }}
      saveError={saveError}
      /* Cuando el contrabalanceo asigno una segunda condicion, el cierre de
         la primera lleva a ella. Antes la direccion la armaba a mano quien
         dirige la sesion, con la condicion y la mitad que tocaban. */
      onContinue={
        siguienteCondicion && siguienteLote
          ? () =>
              navigate(
                `/session?execution=${executionId}&participant=${participantId}` +
                  `&condition=${siguienteCondicion}&batch=${siguienteLote}`,
              )
          : undefined
      }
    />
  );
}

interface SessionProps {
  findings: Finding[];
  /** Presente solo cuando queda una segunda condicion por recorrer. */
  onContinue?: () => void;
  /** Nulo fuera del experimento: entonces la respuesta no se registra. */
  onAnswer?: (findingId: string, choice: Choice, seconds: number) => void;
  /** Fijada por el investigador al preparar la sesión. Sin ella, se puede alternar. */
  fixedCondition?: boolean | null;
  saveError?: string | null;
  /** Avisa con qué presentación quedó fijada la sesión, una sola vez. */
  onThemeFixed?: (theme: "light" | "dark") => void;
}

/* Se exporta para poder probar la condición sin asistente. Esa pantalla es el
   instrumento del experimento: si mostrara el veredicto cuando no debe, la
   comparación entre condiciones quedaría sin sentido y nada lo delataría. */
export function Session({
  findings,
  onAnswer,
  fixedCondition,
  saveError,
  onThemeFixed,
  onContinue,
}: SessionProps) {
  const [stage, setStage] = useState<Stage>("briefing");
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<Record<string, Record_>>({});
  const [lastId, setLastId] = useState<string | null>(null);
  const [assisted, setAssisted] = useState(fixedCondition ?? true);
  const { theme, lock, unlock } = useTheme();
  const [help, setHelp] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  /* Dentro del experimento el tema queda fijado en cuanto empieza la tarea.
     Fuera de él no se toca: quien usa la herramienta en su trabajo elige
     cuando quiera, y la fijación es del instrumento, no del producto. */
  useEffect(() => {
    if (fixedCondition == null || stage === "briefing") return;
    lock();
    /* Se avisa aquí y no en cada render: el tema que interesa registrar es con
       el que se resolvió la tarea, y a partir de este punto ya no cambia. */
    onThemeFixed?.(theme);
    return () => unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedCondition, stage, lock, unlock]);

  const visible = useMemo(
    () =>
      findings.filter((f) => {
        if (filters.pending && records[f.id]) return false;
        if (filters.cwe && f.cwe !== filters.cwe) return false;
        if (assisted && filters.verdict && f.verdict !== filters.verdict) return false;
        if (assisted && filters.anchored !== null && f.anchored !== filters.anchored)
          return false;
        return true;
      }),
    [filters, records, assisted],
  );

  /* Ordenadas por su numero y no como texto: alfabeticamente CWE-78 cae
     detras de CWE-643 y encontrar una en la lista se vuelve un juego. */
  const cwes = useMemo(
    () =>
      [...new Set(findings.map((f) => f.cwe))].sort((a, b) => {
        const na = Number(a.replace(/\D/g, ""));
        const nb = Number(b.replace(/\D/g, ""));
        return Number.isFinite(na) && Number.isFinite(nb)
          ? na - nb
          : a.localeCompare(b);
      }),
    [findings],
  );

  const shownAt = useRef<number>(Date.now());
  const finding = findings[index];
  const resolved = Object.keys(records).length;

  useEffect(() => {
    warmUp();
  }, []);

  /* El cronómetro arranca cuando el hallazgo se muestra, no cuando se carga la
     página: lo que se mide es la decisión de la persona. Los veredictos vienen
     precomputados, así que aquí no hay espera del proveedor. */
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, stage]);

  /* Una tecla responde y avanza. La pulsación involuntaria se cubre por otro
     lado: la corrección queda a la vista, y el registro conserva la respuesta
     anterior marcada como no vigente en vez de sobrescribirla. */
  const answer = useCallback(
    (choice: Choice) => {
      const seconds = (Date.now() - shownAt.current) / 1000;
      setRecords((r) => ({ ...r, [finding.id]: { choice, seconds } }));
      onAnswer?.(finding.id, choice, seconds);
      setLastId(finding.id);
      if (index < findings.length - 1) setIndex(index + 1);
      else setStage("summary");
    },
    [finding.id, index, onAnswer, findings],
  );

  const undo = useCallback(() => {
    const target = lastId ?? findings[Math.max(0, index - 1)]?.id;
    if (!target) return;
    setRecords((r) => {
      const copia = { ...r };
      delete copia[target];
      return copia;
    });
    setIndex(findings.findIndex((f) => f.id === target));
    setLastId(null);
    setStage("review");
  }, [lastId, index]);

  useEffect(() => {
    if (stage !== "review") return;
    function onKey(e: KeyboardEvent) {
      const intent = toIntent(e);
      if (!intent) return;
      if (help && intent.kind !== "help") return;

      switch (intent.kind) {
        case "answer": e.preventDefault(); answer(intent.choice); break;
        case "undo": e.preventDefault(); undo(); break;
        case "prev": if (index > 0) setIndex(index - 1); break;
        case "next": if (index < findings.length - 1) setIndex(index + 1); break;
        case "help": setHelp((h) => !h); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, help, index, answer, undo]);

  if (stage === "briefing") {
    return (
      <Briefing
        assisted={assisted}
        total={findings.length}
        onStart={() => setStage("review")}
      />
    );
  }

  if (stage === "summary") {
    return (
      <Summary
        records={records}
        total={findings.length}
        onReview={() => { setIndex(0); setStage("review"); }}
        onContinue={onContinue}
      />
    );
  }

  const lastRecord = lastId ? records[lastId] : null;

  return (
    <div className={s.page}>
      <header className={s.bar}>
        <span className={s.wordmark}>Certa</span>

        <div className={s.progress}>
          <span className={s.count}>
            Alerta <b>{index + 1}</b> de <b>{findings.length}</b>
          </span>
          <span className={s.rail} aria-hidden="true">
            <span
              className={s.fill}
              style={{ inlineSize: `${(resolved / findings.length) * 100}%` }}
            />
          </span>
          <span className={s.resolved}>{resolved} respondidas</span>
        </div>

        <div className={s.controls}>
          <button className={s.chip} onClick={() => setHelp(true)}>
            Atajos <kbd className={s.chipKbd}>H</kbd>
          </button>
          {fixedCondition == null && (
            <button
              className={s.chip}
              onClick={() => setAssisted((a) => !a)}
              aria-pressed={!assisted}
            >
              {assisted ? "Ver condición de control" : "Volver a la asistida"}
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {saveError && (
        <p className={s.saveNote} role="alert">
          {saveError}
        </p>
      )}

      {!assisted && (
        <p className={s.controlNote}>
          Misma pantalla, misma densidad, mismo orden. Solo se ocultan el
          veredicto, la confianza, la explicación y la comprobación, para que la
          usabilidad no explique la diferencia que se mide.
        </p>
      )}

      <div className={s.grid}>
        <nav className={s.queue} aria-label="Alertas por revisar">
          <h2 className={s.queueTitle}>
            Por revisar
            <span>Ordenadas por lo que más urge. No se quita ninguna.</span>
          </h2>

          <FindingFilters
            filters={filters}
            cwes={cwes}
            assisted={assisted}
            shown={visible.length}
            total={findings.length}
            onChange={setFilters}
          />

          <ul className={s.list}>
            {visible.length === 0 && isFiltering(filters) && (
              <li className={s.emptyList}>
                Ninguna alerta cumple el filtro. Las demás siguen ahí, solo
                están ocultas.
              </li>
            )}
            {visible.map((f) => {
              const i = findings.indexOf(f);
              const rec = records[f.id];
              return (
                <li key={f.id}>
                  <button
                    className={s.item}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                  >
                    <span className={s.itemTitle}>{f.title}</span>
                    <span className={s.itemMeta}>
                      <span className={`${s.itemFile} mono`}>
                        {f.file}:{f.line}
                      </span>
                      {assisted && (
                        <span className={s[f.verdict]}>{VERDICT_SHORT[f.verdict]}</span>
                      )}
                    </span>
                    {rec && (
                      <span className={s.done}>
                        {CHOICE_PAST[rec.choice]} en {rec.seconds.toFixed(0)} s
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className={s.main}>
          <div className={s.head}>
            <h1 className={s.title}>{finding.title}</h1>
            <p className={s.facts}>
              <span className="mono">{finding.cwe}</span> {finding.cweName}, severidad{" "}
              {finding.severity}, en <span className="mono">{finding.file}</span>
            </p>
          </div>

          <p className={s.scope}>
            Esto es todo el código disponible: la función{" "}
            <b className="mono">{finding.enclosing}</b>
            {finding.callers.length > 0 && (
              <> y quien la llama, <b className="mono">{finding.callers.join(", ")}</b></>
            )}
            .
          </p>

          <CodeViewer
            code={finding.code}
            lang={finding.lang}
            firstLine={finding.firstLine}
            cited={finding.cited}
            /* Solo se marca lo que el verificador dio por anclado. Marcar las
               citas de un veredicto que no superó la comprobación presentaría
               como respaldado lo que el sistema no pudo respaldar, que es
               precisamente lo que el mecanismo existe para impedir. */
            showRoles={assisted && finding.anchored}
            theme={theme}
          />

          <p className={s.fingerprint}>
            Huella <span className="mono">{finding.fingerprint}</span>. Se calcula
            sobre el contenido y no sobre el número de línea, así que esta alerta
            se reconoce aunque el código se mueva.
          </p>
        </main>

        <aside className={s.judgement} aria-label="Juicio del asistente">
          <div className={s.judgeScroll}>
          {assisted ? (
            <>
              <div className={s.verdictBlock} data-tone={finding.verdict}>
                <p className={s.verdictWord}>{VERDICT_LABEL[finding.verdict]}</p>
                <p className={s.why}>{finding.reason}</p>
              </div>

              {finding.confidence !== null && (
                <div className={s.row}>
                  <span className={s.rowLabel}>Seguridad del asistente</span>
                  <span className={s.rowValue}>
                    <b className="mono">{finding.confidence.toFixed(2)}</b>
                    <em>{confidenceWord(finding.confidence)}</em>
                  </span>
                  <Scale value={finding.confidence} />
                </div>
              )}

              <div className={s.row}>
                <span className={s.rowLabel}>Comprobación</span>
                <p className={s.checked}>
                  <Tick ok={finding.anchored} />
                  {finding.anchored ? (
                    <>
                      Las {finding.citedCount} líneas que cita existen en el código
                      de arriba. Están marcadas para que las compruebes tú.
                    </>
                  ) : (
                    <>
                      Citó líneas que no existían, dos veces. Su respuesta se
                      descartó y la alerta subió en la lista.
                    </>
                  )}
                </p>
              </div>

              {finding.stability && finding.stability.runs > 1 && (
                <div className={s.row}>
                  <span className={s.rowLabel}>Al repetir</span>
                  <p className={s.plain}>
                    Se preguntó {finding.stability.runs} veces igual y respondió
                    lo mismo{" "}
                    <b>
                      {finding.stability.agree} de {finding.stability.runs}
                    </b>
                    .
                  </p>
                </div>
              )}

              <div className={s.row}>
                <span className={s.rowLabel}>Por qué está aquí</span>
                <p className={s.plain}>{finding.priorityReason}</p>
              </div>
            </>
          ) : (
            <p className={s.blind}>
              En esta condición decides solo con el código. No se muestra ningún
              juicio del asistente.
            </p>
          )}
          </div>

          <div className={s.decide}>
            <h2 className={s.question}>¿Es una vulnerabilidad real?</h2>

            {(["real", "falsa", "duda"] as Choice[]).map((c) => (
              <button
                key={c}
                className={`${s.key} ${s[`key_${c}`]}`}
                onClick={() => answer(c)}
              >
                {CHOICE_LABEL[c]}
                <kbd>{CHOICE_KEY[c]}</kbd>
              </button>
            ))}

            {lastRecord && lastId ? (
              <p className={s.undo}>
                En la anterior {CHOICE_PAST[lastRecord.choice]}.{" "}
                <button className={s.linkish} onClick={undo}>Corregirla</button>
              </p>
            ) : (
              <p className={s.hint}>
                <kbd className={s.inlineKbd}>1</kbd>{" "}
                <kbd className={s.inlineKbd}>2</kbd>{" "}
                <kbd className={s.inlineKbd}>3</kbd> responden y pasan a la
                siguiente. <kbd className={s.inlineKbd}>Retroceso</kbd> corrige
                la anterior.
              </p>
            )}
          </div>
        </aside>
      </div>

      <ShortcutHelp open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

/* Escala graduada: muestra dónde cae el número dentro del rango completo, que es
   más honesto que un porcentaje suelto o una barra llena. */
function Scale({ value }: { value: number }) {
  return (
    <span className={s.scale} aria-hidden="true">
      <span className={s.axis} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <span
          key={t}
          className={t % 0.5 === 0 ? s.tickMajor : s.tickMinor}
          style={{ insetInlineStart: `${t * 100}%` }}
        >
          {t % 0.5 === 0 && <em>{t}</em>}
        </span>
      ))}
      <span className={s.needle} style={{ insetInlineStart: `${value * 100}%` }} />
    </span>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? s.tickOk : s.tickBad} aria-hidden="true">
      {ok ? "✓" : "!"}
    </span>
  );
}
