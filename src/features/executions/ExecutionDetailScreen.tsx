import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getToken } from "../../shared/api";
import { EXECUTIONS, METRICS, STATUS_LABEL } from "../../shared/fixtures";
import { toFinding } from "../audit/adapter";
import { FINDINGS, VERDICT_SHORT } from "../audit/data";
import { Hint } from "../../shared/Hint";
import { cuando, titulo } from "../../shared/executions";
import { useProyecto } from "../../shared/project";
import { Failed, Loading } from "../../shared/States";
import { useAction, useApi } from "../../shared/useApi";
import s from "./ExecutionDetailScreen.module.css";

export function ExecutionDetailScreen() {
  const { id = "" } = useParams<{ id: string }>();

  const exec = useApi(
    () => api.execution(id),
    EXECUTIONS.find((e) => e.id === id) ?? EXECUTIONS[0],
    [id],
  );
  /* Las de más arriba en la lista priorizada. La pantalla terminaba en los
     números y no enseñaba ni una alerta, que es lo que la persona vino a
     mirar; y con el ancho que sobraba, caben. */
  const alertas = useApi(
    async () => (await api.findings(id)).map((h) => toFinding(h, null)),
    FINDINGS,
    [id],
  );

  /* Con datos de muestra, la que no tiene métricas propias no hereda las de
     otra: eso pintaba las mismas cinco cifras en tres ejecuciones distintas,
     una de ellas sin nada validado. */
  const metrics = useApi(() => api.metrics(id), METRICS[id], [id]);

  const run = useAction(async () => {
    /* Una corrida que se cortó vuelve a la cola por su propio camino. El
       trabajador toma las pendientes, así que encolar sin más la que quedó
       interrumpida la dejaba parada donde estaba. */
    const r =
      exec.data?.status === "fallida"
        ? await api.resume(id)
        : await api.run(id);
    exec.reload();
    metrics.reload();
    return r;
  });

  const download = useAction(async () => {
    // La descarga necesita el token, así que no puede ser un enlace directo:
    // se pide con cabecera y se entrega como archivo.
    const res = await fetch(api.exportUrl(id), {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? "La ejecución no registra veredictos, así que no hay nada que exportar."
          : `El servicio respondió ${res.status}`,
      );
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certa-${id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  });

  /* Llegar a una ejecución por enlace cambia el proyecto de la barra. Sin
     esto, la barra seguía enseñando las corridas de otro proyecto mientras la
     pantalla hablaba de este. */
  const { actual, elegir } = useProyecto();
  const suyo = exec.data?.project_id;
  useEffect(() => {
    if (suyo && suyo !== actual?.id) elegir(suyo);
  }, [suyo, actual?.id, elegir]);

  /* Una sola acción principal a la vista, y el resto plegado. Exportar,
     comparar, soltar el contexto y reanudar en la misma fila y con el mismo
     peso obligaban a leer las cuatro para encontrar la que hacía falta. */
  const [menu, setMenu] = useState(false);
  const cajaMenu = useRef<HTMLDivElement>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const fuera = (e: MouseEvent) => {
      if (!cajaMenu.current?.contains(e.target as Node)) setMenu(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      /* Cerrar con Escape deja el foco donde estaba la opción, que acaba de
         desaparecer, y quien navega con teclado vuelve al principio de la
         página. Devolverlo al botón continúa donde estaba. */
      botonMenu.current?.focus();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  /* Devolver a la cola la que se quedó en proceso. El trabajador de la
     plataforma gratuita se reinicia, y la corrida que tenía reclamada no
     vuelve sola: la cola mira el estado, y ese sigue diciendo «en proceso».
     Confirmación en dos pasos porque, si el trabajador sigue vivo, dos
     podrían validar los mismos hallazgos y eso se paga dos veces. */
  const [devolviendo, setDevolviendo] = useState(false);
  const devolver = useAction(async () => {
    const r = await api.resume(id);
    setDevolviendo(false);
    exec.reload();
    return r;
  });

  /* Soltar el código conservado es irreversible: sin él, la pantalla de
     auditoría deja de poder enseñar el fragmento que explica el veredicto. De
     ahí la confirmación en dos pasos, en la propia línea y sin diálogo. */
  const [confirmando, setConfirmando] = useState(false);
  const [soltados, setSoltados] = useState<number | null>(null);
  const purge = useAction(async () => {
    const r = await api.purge(id);
    setConfirmando(false);
    setSoltados(r.purged);
    exec.reload();
    return r;
  });

  /* Mientras la corrida no termina, el estado lo cambia el trabajador y no
     quien mira. Sin esto había que recargar a mano para enterarse de que ya
     avanzó, o de que volvió a la cola sin poder empezar. */
  const viva =
    exec.data?.status === "pendiente" || exec.data?.status === "en_proceso";
  useEffect(() => {
    if (!viva) return;
    const t = setInterval(() => exec.reload(), 10000);
    return () => clearInterval(t);
  }, [viva, exec.reload]);

  // El aviso de carga solo cuando no hay nada que enseñar: un refresco con la
  // pantalla puesta no debe vaciarla.
  if (exec.loading && !exec.data) return <Loading what="la ejecución" />;
  if (exec.error) return <Failed message={exec.error} onRetry={exec.reload} />;

  const execution = exec.data;
  if (!execution) {
    return (
      <div className={s.missing}>
        <h1>No existe esa ejecución</h1>
        <p>Puede que se haya borrado, o que el identificador esté mal escrito.</p>
        <Link className={s.secondary} to="/executions">Volver a la lista</Link>
      </div>
    );
  }

  /* La cinta se arma con lo que ya está juzgado. Los indeterminados no entran
     en la matriz, así que se cuentan por diferencia: si no, la cinta no
     sumaría el total y nadie sabría dónde fueron a parar. */
  /* Solo un conjunto de referencia permite repartir lo juzgado entre reales y
     descartadas. En un repositorio cualquiera no hay con qué, de modo que la
     cinta dice lo único cierto: cuánto se juzgó y cuánto sigue en cola.
     Repartirlo igual metía todo en «sin poder determinar», que era falso. */
  const conf = metrics.data?.confusion;
  const tramos = conf
    ? [
        {
          tipo: "real",
          n: conf.verdaderos_positivos + conf.falsos_positivos,
          rotulo: "marcadas como reales",
        },
        {
          tipo: "descartada",
          n: conf.falsos_negativos + conf.verdaderos_negativos,
          rotulo: "descartadas",
        },
        {
          tipo: "indeterminada",
          n: Math.max(
            0,
            execution.validated_findings -
              conf.verdaderos_positivos -
              conf.falsos_positivos -
              conf.falsos_negativos -
              conf.verdaderos_negativos,
          ),
          rotulo: "sin poder determinar",
        },
        {
          tipo: "cola",
          n: execution.pending_findings,
          rotulo: "todavía en cola",
        },
      ]
    : [
        {
          tipo: "juzgada",
          n: execution.validated_findings,
          rotulo: "ya juzgadas por el asistente",
        },
        {
          tipo: "cola",
          n: execution.pending_findings,
          rotulo: "todavía en cola",
        },
      ];

  const pendiente = execution.status === "pendiente";
  const interrumpida = execution.status === "fallida";
  const enProceso = execution.status === "en_proceso";
  /* «Procesando» en verde mientras lleva dieciséis días parada es el peor de
     los dos mensajes posibles. Pasadas dos horas sin terminar, lo honesto es
     decir que está detenida. */
  const detenida =
    enProceso &&
    !!execution.started_at &&
    Date.now() - new Date(execution.started_at).getTime() > 2 * 60 * 60 * 1000;
  const terminada = execution.status === "completada";

  return (
    <>
      <p className={s.crumb}>
        <Link to="/executions">Ejecuciones</Link> <span aria-hidden="true">/</span>{" "}
        <span className="mono">{execution.id.slice(0, 8)}</span>
      </p>

      <div className={s.head}>
        <div>
          {/* El título es la corrida, no el proyecto: el proyecto ya lo dice
              la barra, y dos corridas del mismo se llamaban igual. */}
          <h1 className={s.title}>{titulo(execution)}</h1>
          <p className={s.facts}>
            <span
              className={`${s.badge} ${detenida ? s.fallida : s[execution.status]}`}
            >
              {detenida ? "Detenida" : STATUS_LABEL[execution.status]}
            </span>
            <span className="mono" translate="no">
              {execution.tool_name} {execution.ruleset_version}
            </span>
            <span className={s.cuando}>
              {execution.project_name || "Proyecto sin nombre"}
            </span>
            <span className={s.cuando}>{cuando(execution.created_at)}</span>
            <span className={s.cuando}>{execution.progress_text}</span>
          </p>
        </div>
        <div className={s.headActions}>
          {(pendiente || interrumpida) && (
            <button
              className={s.primary}
              disabled={run.busy}
              aria-busy={run.busy}
              onClick={() => run.run()}
            >
              {run.busy
                ? "Encolando…"
                : interrumpida
                  ? "Reanudar donde quedó"
                  : "Validar los pendientes"}
            </button>
          )}
          {terminada && (
            <Link className={s.primary} to={`/review?execution=${id}`}>
              Revisar las {execution.total_findings} alertas
            </Link>
          )}
          {/* Mientras corre también se puede revisar lo que ya tiene veredicto:
              esperar a que termine para empezar a mirar no aporta nada. */}
          {/* La revisión abre la lista entera, no solo lo ya juzgado: decir
              «las 727 juzgadas» y aterrizar en 2166 era mentir en el botón. */}
          {!terminada && execution.validated_findings > 0 && (
            <Link className={s.secondary} to={`/review?execution=${id}`}>
              Revisar las {execution.total_findings} alertas
            </Link>
          )}

          <div className={s.mas} ref={cajaMenu}>
            <button
              type="button"
              className={s.masBoton}
              ref={botonMenu}
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-haspopup="menu"
            >
              Más acciones
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                <path
                  d="m4.5 6.5 3.5 3.5 3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menu && (
              <ul className={s.masLista} role="menu">
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={s.masOpcion}
                    disabled={download.busy}
                    onClick={() => {
                      setMenu(false);
                      download.run();
                    }}
                  >
                    {download.busy ? "Preparando…" : "Exportar a CSV"}
                    <span className={s.masDato}>Un renglón por alerta</span>
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={s.masOpcion}
                    onClick={() => {
                      setMenu(false);
                      setConfirmando(true);
                    }}
                  >
                    Borrar el código guardado
                    <span className={s.masDato}>
                      Los veredictos se quedan; se pierde el fragmento que los
                      sostiene
                    </span>
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {confirmando && (
        <div className={s.confirmarFila}>
          <span className={s.confirmarTexto}>
            <b>¿Borrar el código guardado de esta ejecución?</b> Certa copia
            el pedazo de código que el modelo miró para justificar cada
            veredicto. Los veredictos y sus justificaciones se quedan; lo que
            se pierde es poder abrir esa copia y ver de qué hablaban. No se
            deshace.
          </span>
          <button
            className={s.peligro}
            disabled={purge.busy}
            aria-busy={purge.busy}
            onClick={() => purge.run()}
          >
            {purge.busy ? "Borrando…" : "Sí, borrarlo"}
          </button>
          <button className={s.secondary} onClick={() => setConfirmando(false)}>
            No
          </button>
        </div>
      )}

      <div role="alert" aria-live="assertive">
        {run.error && <p className={s.problem}>{run.error}</p>}
        {download.error && <p className={s.problem}>{download.error}</p>}
        {devolver.error && <p className={s.problem}>{devolver.error}</p>}
        {purge.error && <p className={s.problem}>{purge.error}</p>}
      </div>
      <div role="status" aria-live="polite">
        {soltados !== null && (
          <p className={s.notice}>
            Se borraron <b className="mono">{soltados}</b> copias de código.
            Los veredictos y sus justificaciones siguen ahí.
          </p>
        )}
      </div>

      {execution.last_attempt_note && (
        <p className={s.notice}>
          <b>
            El último intento no pudo empezar
            {execution.last_attempt_at
              ? `, ${desde(execution.last_attempt_at)}`
              : ""}
            .
          </b>{" "}
          {execution.last_attempt_note}
        </p>
      )}

      {/* La acción de recuperación va aquí y no en la fila de arriba: solo
          tiene sentido junto a la explicación de por qué haría falta. */}
      {enProceso && (
        <div className={s.notice}>
          <b>
            Esta ejecución empezó{" "}
            {execution.started_at ? desde(execution.started_at) : "hace rato"} y
            no ha terminado.
          </b>{" "}
          Reanudarla no pierde nada de lo que el asistente ya juzgó.
          {devolviendo ? (
            <span className={`${s.confirmar} ${s.avisoAccion}`}>
              ¿Reanudarla? Si el asistente todavía está trabajando en ella,
              reanudar ahora haría que dos la juzguen a la vez, y eso se paga
              dos veces.
              <button
                className={s.peligro}
                disabled={devolver.busy}
                aria-busy={devolver.busy}
                onClick={() => devolver.run()}
              >
                {devolver.busy ? "Reanudando…" : "Sí, reanudarla"}
              </button>
              <button
                className={s.secondary}
                onClick={() => setDevolviendo(false)}
              >
                No
              </button>
            </span>
          ) : (
            <span className={s.avisoAccion}>
              <button
                className={s.secondary}
                onClick={() => setDevolviendo(true)}
              >
                Reanudar
              </button>
            </span>
          )}
        </div>
      )}

      {execution.failure_reason && (
        <p className={s.notice}>
          <b>Se interrumpió.</b> {execution.failure_reason} Al reanudar no se
          vuelve a pagar por lo ya validado.
        </p>
      )}

      {/* La corrida a la izquierda y el marcador a la derecha. Apilados, el
          ancho sobrante quedaba vacío y había que desplazarse para ver algo
          que cabe de sobra al costado. */}
      <div className={s.lienzo}>
        <section className={s.corrida}>
          <h2 className={s.h2}>
            Cómo quedaron las{" "}
            <b className="mono">{execution.total_findings}</b> alertas
          </h2>

          <Cinta tramos={tramos} total={execution.total_findings} />

          {/* En un monitor ancho las cuentas y la matriz caben lado a lado.
              Apiladas dejaban medio panel vacío a la derecha. */}
          <div className={s.dosColumnas}>
            <ul className={s.cuentas}>
              {tramos.map((t) => (
                <Cuenta key={t.tipo} tipo={t.tipo} n={t.n} rotulo={t.rotulo} />
              ))}
            </ul>

          {metrics.loading && <Loading what="las métricas" />}

          {execution.validated_findings > 0 && metrics.data && !metrics.error && (
            /* Un solo hijo de la rejilla: sueltos, el rótulo se iba a una
               columna y la matriz a otra fila. */
            <div className={s.contraVerdad}>
              <h3 className={s.h3}>
                Frente a las respuestas que ya se conocen
                <Hint termino="la comparación contra verdad conocida">
                  Este proyecto es un conjunto de referencia: de cada alerta ya
                  se sabe si era real. Por eso se puede contar en qué acertó y
                  en qué no. En un repositorio tuyo esta parte no aparece,
                  porque no hay con qué comparar.
                </Hint>
              </h3>
              <div className={s.matrix}>
                <Cell
                  kind="tp"
                  n={metrics.data.confusion.verdaderos_positivos}
                  label="Acertó que era real"
                  ayuda="Certa la marcó como vulnerabilidad real, y sí lo era. Es el acierto que buscas."
                />
                <Cell
                  kind="fp"
                  n={metrics.data.confusion.falsos_positivos}
                  label="Dijo real y no lo era"
                  ayuda="Certa la marcó como vulnerabilidad real y resultó falsa alarma. Este error te hace perder el tiempo revisando algo que no era."
                />
                <Cell
                  kind="fn"
                  n={metrics.data.confusion.falsos_negativos}
                  label="Descartó algo real"
                  ayuda="Certa la descartó y sí era una vulnerabilidad real. Es el error caro: pasa de largo sin que nadie la mire."
                />
                <Cell
                  kind="tn"
                  n={metrics.data.confusion.verdaderos_negativos}
                  label="Acertó que era falsa alarma"
                  ayuda="Certa la descartó y efectivamente no era explotable. Es el trabajo de revisión que te ahorra."
                />
              </div>
            </div>
          )}
          </div>
        </section>

        {/* Sin nada juzgado no hay nada que medir, y enseñar cifras ahí es
            enseñar cifras de otra ejecución. */}
        {execution.validated_findings > 0 && metrics.data && !metrics.error && (
          <aside className={s.marcador}>
            <h2 className={s.h2}>Qué tan bien juzgó</h2>

            <dl className={s.scores}>
              <Score
                label="F1"
                value={metrics.data.confusion.f1}
                threshold={0.75}
                ayuda="Junta la precisión y la exhaustividad en un solo número, de 0 a 1. Sube solo si suben las dos, así que no se puede quedar bien en una descuidando la otra."
              />
              <Score
                label="Exactitud"
                value={metrics.data.confusion.exactitud}
                ayuda="De todas las alertas que Certa juzgó, en qué parte acertó. Engaña cuando casi todas son falsas alarmas: descartarlas todas ya daría exactitud alta sin servir de nada."
              />
              <Score
                label="Precisión"
                value={metrics.data.confusion.precision}
                ayuda="De las alertas que Certa marcó como vulnerabilidad real, qué parte lo era de verdad. Si baja, arriba de la lista se te acumulan falsas alarmas."
              />
              <Score
                label="Exhaustividad"
                value={metrics.data.confusion.exhaustividad}
                ayuda="De las alertas que sí eran vulnerabilidades reales, qué parte alcanzó a marcar Certa. Si baja, quedan vulnerabilidades de verdad enterradas al fondo de la lista."
              />
              <Score
                label="Anclaje a la primera"
                value={metrics.data.anchor_rate_first_try}
                threshold={0.85}
                ayuda="Qué parte de los veredictos citó, al primer intento, líneas que existen de verdad en el archivo. Si cita líneas que no existen, no hay cómo comprobar lo que dice, por convincente que suene."
              />
            </dl>

            <p className={metrics.data.run_is_valid ? s.valid : s.invalid}>
              {metrics.data.run_quality_reason}
            </p>
            <p className={s.budget}>{metrics.data.budget}</p>
          </aside>
        )}
      </div>

      {alertas.data && alertas.data.length > 0 && (
        <section className={s.porEmpezar}>
          <div className={s.porEmpezarTop}>
            <h2 className={s.h2}>Por dónde empezar</h2>
            <Link className={s.verTodas} to={`/review?execution=${id}`}>
              Revisar las {execution.total_findings} alertas
            </Link>
          </div>
          <ul className={s.alertas}>
            {alertas.data.slice(0, 3).map((a) => (
              <li key={a.id} className={s.alerta}>
                <span className={s.alertaQue}>{a.title}</span>
                <span className={s.alertaDonde}>
                  <span className="mono">
                    {a.file}:{a.line}
                  </span>{" "}
                  {a.cweName}
                </span>
                <span className={s.alertaSeveridad} data-nivel={a.severity}>
                  severidad {a.severity}
                </span>
                <span className={s.alertaVeredicto} data-valor={a.verdict}>
                  {VERDICT_SHORT[a.verdict]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </>
  );
}

/* La fecha se formatea con el locale del navegador y no a mano: quien revise
   esto desde otro huso no tiene por que leer el nuestro. */
/** Cuánto lleva así, en palabras. «hace 3 horas». */
function desde(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const minutos = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

/* La corrida entera en una franja: cada tramo es la parte que le toca a cada
   desenlace, y lo que sigue en cola va rayado porque todavía no es nada. Es el
   único elemento con peso visual de la pantalla, y no es adorno: es el
   resultado de la corrida dibujado a escala. */
interface Tramo {
  tipo: string;
  n: number;
  rotulo: string;
}

function Cinta({ tramos, total }: { tramos: Tramo[]; total: number }) {
  const visibles = tramos.filter((t) => t.n > 0);
  const dicho = visibles.map((t) => `${t.n} ${t.rotulo}`).join(", ");

  return (
    <div
      className={s.cinta}
      role="img"
      aria-label={total ? `De ${total} alertas: ${dicho}.` : "Sin alertas"}
    >
      {visibles.map((t) => (
        <span
          key={t.tipo}
          className={s.tramo}
          data-tipo={t.tipo}
          style={{ flexGrow: t.n }}
        />
      ))}
    </div>
  );
}

function Cuenta({
  tipo, n, rotulo,
}: { tipo: string; n: number; rotulo: string }) {
  return (
    <li className={s.cuenta}>
      <span className={s.cuentaMarca} data-tipo={tipo} aria-hidden="true" />
      <span className={`${s.cuentaN} mono`}>{n}</span>
      <span className={s.cuentaR}>{rotulo}</span>
    </li>
  );
}

function Cell({
  kind, n, label, ayuda,
}: { kind: string; n: number; label: string; ayuda: string }) {
  return (
    <div className={s.cell} data-kind={kind}>
      <span className={s.cellN}>{n}</span>
      <span className={s.cellL}>
        {label} <Hint termino={label}>{ayuda}</Hint>
      </span>
    </div>
  );
}

function Score({
  label, value, threshold, ayuda,
}: { label: string; value: number; threshold?: number; ayuda: string }) {
  const falla = threshold !== undefined && value < threshold;
  return (
    <div className={s.score} data-falla={falla || undefined}>
      <dt className={s.scoreQue}>
        {label} <Hint termino={label}>{ayuda}</Hint>
      </dt>
      <dd className={`${s.scoreN} mono`}>{value.toFixed(3)}</dd>
      {/* La barra va de 0 a 1 y lleva marcado el umbral declarado, de modo
          que la cifra se lee contra algo y no sola. */}
      <span className={s.scoreBarra}>
        <span className={s.scoreRelleno} style={{ inlineSize: `${value * 100}%` }} />
        {threshold !== undefined && (
          <span
            className={s.scoreUmbral}
            style={{ insetInlineStart: `${threshold * 100}%` }}
            title={`umbral declarado ${threshold.toFixed(2)}`}
          />
        )}
      </span>
    </div>
  );
}
