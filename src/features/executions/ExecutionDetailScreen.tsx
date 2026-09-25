import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getToken } from "../../shared/api";
import { EXECUTIONS, METRICS, STATUS_LABEL } from "../../shared/fixtures";
import { Hint } from "../../shared/Hint";
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
  const metrics = useApi(
    () => api.metrics(id),
    METRICS[id] ?? METRICS["7f3a2b10"],
    [id],
  );

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

  const pendiente = execution.status === "pendiente";
  const interrumpida = execution.status === "fallida";
  const enProceso = execution.status === "en_proceso";
  const terminada = execution.status === "completada";

  return (
    <>
      <p className={s.crumb}>
        <Link to="/executions">Ejecuciones</Link> <span aria-hidden="true">/</span>{" "}
        <span className="mono">{execution.id.slice(0, 8)}</span>
      </p>

      <div className={s.head}>
        <div>
          <h1 className={s.title}>{execution.project_name || "Proyecto sin nombre"}</h1>
          <p className={s.facts}>
            <span className={`${s.badge} ${s[execution.status]}`}>
              {STATUS_LABEL[execution.status]}
            </span>
            <span className="mono" translate="no">
              {execution.tool_name} {execution.ruleset_version}
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
              Revisar los hallazgos
            </Link>
          )}
          {/* Mientras corre también se puede revisar lo que ya tiene veredicto:
              esperar a que termine para empezar a mirar no aporta nada. */}
          {!terminada && execution.validated_findings > 0 && (
            <Link className={s.secondary} to={`/review?execution=${id}`}>
              Revisar lo validado
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
                    <span className={s.masDato}>
                      Un renglón por hallazgo, sin datos de personas
                    </span>
                  </button>
                </li>
                <li role="none">
                  <Link
                    role="menuitem"
                    className={s.masOpcion}
                    to={`/executions/${id}/compare`}
                    onClick={() => setMenu(false)}
                  >
                    Comparar con otra corrida
                    <span className={s.masDato}>
                      Qué alertas son nuevas, cuáles se resolvieron
                    </span>
                  </Link>
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
                    Soltar el código conservado
                    <span className={s.masDato}>
                      Libera espacio y ya no se puede enseñar el fragmento
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
            <b>¿Soltar el código conservado?</b> Los veredictos y sus
            justificaciones se quedan. Lo que se pierde es poder enseñar el
            fragmento que los sostiene, y eso no se deshace.
          </span>
          <button
            className={s.peligro}
            disabled={purge.busy}
            aria-busy={purge.busy}
            onClick={() => purge.run()}
          >
            {purge.busy ? "Soltando…" : "Sí, soltarlo"}
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
            Se soltaron <b className="mono">{soltados}</b> fragmentos.
            Los veredictos y sus justificaciones siguen ahí; lo que ya no se
            puede es enseñar el código que los sostiene.
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
          <b>La tomó {execution.claimed_by || "un trabajador"}</b>
          {execution.started_at ? ` ${desde(execution.started_at)}` : ""}. Si ese
          trabajador se reinició, la corrida se queda así: la cola mira el
          estado, y devolverla es lo que la vuelve a poner al alcance del
          siguiente. Lo ya validado se conserva.
          {devolviendo ? (
            <span className={`${s.confirmar} ${s.avisoAccion}`}>
              ¿Devolverla? Con un trabajador todavía vivo habría dos validando
              los mismos hallazgos, y eso se paga dos veces.
              <button
                className={s.peligro}
                disabled={devolver.busy}
                aria-busy={devolver.busy}
                onClick={() => devolver.run()}
              >
                {devolver.busy ? "Devolviendo…" : "Sí, devolverla"}
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
                Devolver a la cola
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

      {/* Terminada, la barra al 100 % y los tres números ocupan un panel
          entero para decir lo que la línea de arriba ya dice. */}
      {!terminada && (
      <section className={s.panel}>
        <h2 className={s.h2}>Avance</h2>
        <span
          className={s.rail}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={execution.total_findings}
          aria-valuenow={execution.validated_findings}
          aria-valuetext={execution.progress_text}
        >
          <span className={s.fill} style={{ inlineSize: `${execution.progress * 100}%` }} />
        </span>
        <div className={s.counts}>
          <span><b className="mono">{execution.total_findings}</b> hallazgos</span>
          <span><b className="mono">{execution.validated_findings}</b> validados</span>
          <span><b className="mono">{execution.pending_findings}</b> pendientes</span>
        </div>
      </section>
      )}

      {/* Un panel entero para anunciar que todavía no hay nada empuja fuera de
          la pantalla lo que sí importa cuando la corrida aún no arrancó. */}
      {execution.validated_findings > 0 && (
      <section className={s.panel}>
        <h2 className={s.h2}>Resultados</h2>

        {metrics.loading && <Loading what="las métricas" />}
        {metrics.error && (
          <p className={s.note}>
            Todavía no hay veredictos suficientes para medir. Los resultados
            aparecen cuando la corrida avance.
          </p>
        )}

        {metrics.data && !metrics.error && (
          <>
            <p className={s.note}>
              Se muestra la matriz completa y no solo la exactitud: un modelo
              que llamara real a todo tendría exactitud aceptable y utilidad
              nula, y solo la matriz lo deja ver.
            </p>

            <div className={s.matrix}>
              <Cell
                kind="tp"
                n={metrics.data.confusion.verdaderos_positivos}
                label="Acertó que era real"
                ayuda="La alerta era una vulnerabilidad de verdad y el modelo la subió de prioridad. Es el acierto que buscas."
              />
              <Cell
                kind="fp"
                n={metrics.data.confusion.falsos_positivos}
                label="Dijo real y no lo era"
                ayuda="La subió de prioridad y resultó falsa alarma. Este error te hace perder tiempo revisando algo que no era."
              />
              <Cell
                kind="fn"
                n={metrics.data.confusion.falsos_negativos}
                label="Descartó algo real"
                ayuda="La bajó de prioridad y sí era explotable. Es el error caro: una vulnerabilidad que pasa sin que nadie la mire."
              />
              <Cell
                kind="tn"
                n={metrics.data.confusion.verdaderos_negativos}
                label="Acertó que era falsa alarma"
                ayuda="La descartó y efectivamente no era explotable. Es el trabajo de revisión que te ahorra."
              />
            </div>

            <dl className={s.scores}>
              <Score
                label="F1"
                value={metrics.data.confusion.f1}
                threshold={0.75}
                ayuda="Resume en un solo número la precisión y la exhaustividad. Sube solo si las dos suben, así que no se puede quedar bien en una descuidando la otra. Va de 0 a 1."
              />
              <Score
                label="Exactitud"
                value={metrics.data.confusion.exactitud}
                ayuda="De todas las alertas que juzgó, en cuántas acertó. Engaña cuando una clase domina: si casi todas son falsas alarmas, descartarlas todas ya da exactitud alta y utilidad nula."
              />
              <Score
                label="Precisión"
                value={metrics.data.confusion.precision}
                ayuda="De las que subió de prioridad, cuántas eran de verdad. Si baja, la lista de arriba se llena de falsas alarmas y deja de valer la pena leerla."
              />
              <Score
                label="Exhaustividad"
                value={metrics.data.confusion.exhaustividad}
                ayuda="De las que eran de verdad, cuántas alcanzó a subir. Si baja, quedan vulnerabilidades reales enterradas al fondo de la lista."
              />
              <Score
                label="Anclaje a la primera"
                value={metrics.data.anchor_rate_first_try}
                threshold={0.85}
                ayuda="Cuántos veredictos citaron, al primer intento, líneas que existen en el código. Un veredicto que cita líneas inventadas no se puede comprobar, por más convincente que suene."
              />
            </dl>

            <p className={metrics.data.run_is_valid ? s.valid : s.invalid}>
              {metrics.data.run_is_valid ? "Corrida válida. " : "Corrida rechazada. "}
              {metrics.data.run_quality_reason}
            </p>
            <p className={s.budget}>{metrics.data.budget}</p>
          </>
        )}
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

function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
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
  const cumple = threshold === undefined ? null : value >= threshold;
  return (
    <div className={s.score}>
      <dt>
        {label} <Hint termino={label}>{ayuda}</Hint>
      </dt>
      <dd className="mono">{value.toFixed(3)}</dd>
      {threshold !== undefined && (
        <span className={cumple ? s.meets : s.misses}>
          umbral {threshold.toFixed(2)}
        </span>
      )}
    </div>
  );
}
