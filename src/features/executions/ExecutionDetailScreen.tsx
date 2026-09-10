import { Link, useParams } from "react-router-dom";
import { api, getToken } from "../../shared/api";
import { EXECUTIONS, METRICS, STATUS_LABEL } from "../../shared/fixtures";
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
    const r = await api.run(id);
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

  if (exec.loading) return <Loading what="la ejecución" />;
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
            <span className="mono">{execution.tool_name} {execution.ruleset_version}</span>
          </p>
        </div>
        <div className={s.headActions}>
          {(pendiente || interrumpida) && (
            <button className={s.primary} disabled={run.busy} onClick={() => run.run()}>
              {run.busy
                ? "Validando"
                : interrumpida
                  ? "Reanudar donde quedó"
                  : "Validar los pendientes"}
            </button>
          )}
          <button
            className={s.secondary}
            disabled={download.busy}
            onClick={() => download.run()}
          >
            {download.busy ? "Preparando" : "Exportar CSV"}
          </button>
        </div>
      </div>

      {run.error && <p className={s.problem}>{run.error}</p>}
      {download.error && <p className={s.problem}>{download.error}</p>}

      {execution.failure_reason && (
        <p className={s.notice}>
          <b>Se interrumpió.</b> {execution.failure_reason} Al reanudar no se
          vuelve a pagar por lo ya validado.
        </p>
      )}

      <section className={s.panel}>
        <h2 className={s.h2}>Avance</h2>
        <p className={s.progressText}>{execution.progress_text}</p>
        <span className={s.rail} aria-hidden="true">
          <span className={s.fill} style={{ inlineSize: `${execution.progress * 100}%` }} />
        </span>
        <div className={s.counts}>
          <span><b className="mono">{execution.total_findings}</b> hallazgos</span>
          <span><b className="mono">{execution.validated_findings}</b> validados</span>
          <span><b className="mono">{execution.pending_findings}</b> pendientes</span>
        </div>
      </section>

      <section className={s.panel}>
        <h2 className={s.h2}>Resultados</h2>

        {metrics.loading && <Loading what="las métricas" />}
        {metrics.error && (
          <p className={s.note}>
            Todavía no hay veredictos suficientes. Los resultados aparecen cuando
            la ejecución termine.
          </p>
        )}

        {metrics.data && !metrics.error && (
          <>
            <p className={s.note}>
              Se reporta la matriz completa y no solo la exactitud: un modelo que
              declarase explotable a todo obtendría exactitud aceptable sobre un
              conjunto desbalanceado y utilidad nula, y solo la matriz lo hace
              visible.
            </p>

            <div className={s.matrix}>
              <Cell kind="tp" n={metrics.data.confusion.verdaderos_positivos} label="Acertó que era real" />
              <Cell kind="fp" n={metrics.data.confusion.falsos_positivos} label="Dijo real y no lo era" />
              <Cell kind="fn" n={metrics.data.confusion.falsos_negativos} label="Descartó algo real" />
              <Cell kind="tn" n={metrics.data.confusion.verdaderos_negativos} label="Acertó que era falsa alarma" />
            </div>

            <dl className={s.scores}>
              <Score label="F1" value={metrics.data.confusion.f1} threshold={0.75} />
              <Score label="Exactitud" value={metrics.data.confusion.exactitud} />
              <Score label="Precisión" value={metrics.data.confusion.precision} />
              <Score label="Exhaustividad" value={metrics.data.confusion.exhaustividad} />
              <Score label="Anclaje a la primera" value={metrics.data.anchor_rate_first_try} threshold={0.85} />
            </dl>

            <p className={metrics.data.run_is_valid ? s.valid : s.invalid}>
              {metrics.data.run_is_valid ? "Corrida válida. " : "Corrida rechazada. "}
              {metrics.data.run_quality_reason}
            </p>
            <p className={s.budget}>{metrics.data.budget}</p>
          </>
        )}
      </section>

      <section className={s.panel}>
        <h2 className={s.h2}>Revisar los hallazgos</h2>
        <p className={s.note}>
          Abre la interfaz de auditoría para recorrer la lista priorizada,
          comprobar el anclaje y registrar decisiones.
        </p>
        <Link className={s.primary} to="/review">Abrir la auditoría</Link>
      </section>
    </>
  );
}

function Cell({ kind, n, label }: { kind: string; n: number; label: string }) {
  return (
    <div className={s.cell} data-kind={kind}>
      <span className={s.cellN}>{n}</span>
      <span className={s.cellL}>{label}</span>
    </div>
  );
}

function Score({
  label, value, threshold,
}: { label: string; value: number; threshold?: number }) {
  const cumple = threshold === undefined ? null : value >= threshold;
  return (
    <div className={s.score}>
      <dt>{label}</dt>
      <dd className="mono">{value.toFixed(3)}</dd>
      {threshold !== undefined && (
        <span className={cumple ? s.meets : s.misses}>
          umbral {threshold.toFixed(2)}
        </span>
      )}
    </div>
  );
}
