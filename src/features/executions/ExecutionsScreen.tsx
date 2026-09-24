import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import { EXECUTIONS, STATUS_LABEL } from "../../shared/fixtures";
import { Empty, Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import s from "./ExecutionsScreen.module.css";

export function ExecutionsScreen() {
  const { data, loading, error, reload } = useApi(() => api.executions(), EXECUTIONS);

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Ejecuciones</h1>
          <p className={s.lead}>
            Cada ejecución es una corrida del analizador sobre un proyecto. La
            versión del conjunto de reglas se registra porque sin ella comparar
            dos corridas no tendría sentido.
          </p>
        </div>
        <Link className={s.primary} to="/executions/new">
          Cargar archivo SARIF
        </Link>
      </div>

      {loading && <Loading what="las ejecuciones" />}
      {error && <Failed message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Empty title="Todavía no hay ejecuciones">
          <p>
            Corre el analizador estático sobre un proyecto y carga aquí el
            archivo SARIF que produce. Certa no detecta vulnerabilidades: juzga
            las que otro detectó.
          </p>
          <Link className={s.primary} to="/executions/new">
            Cargar el primero
          </Link>
        </Empty>
      )}

      {data && data.length > 0 && (
        <table className={s.table}>
          <caption className="solo-lectores">
            Ejecuciones del analizador, con su avance de validación
          </caption>
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>Reglas</th>
              <th>Estado</th>
              <th className={s.numeric}>Hallazgos</th>
              <th>Avance</th>
              <th>
                <span className="solo-lectores">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className={s.project}>
                    {e.project_name || "Proyecto sin nombre"}
                  </span>
                  <span className={`${s.sub} mono`}>{e.id.slice(0, 8)}</span>
                </td>
                <td className="mono" translate="no">
                  {e.tool_name} {e.ruleset_version}
                </td>
                <td>
                  <span className={`${s.badge} ${s[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.failure_reason && <span className={s.sub}>{e.failure_reason}</span>}
                </td>
                <td className={`${s.numeric} mono`}>{e.total_findings}</td>
                <td className={s.progressCell}>
                  <span
                    className={s.rail}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={e.total_findings}
                    aria-valuenow={e.validated_findings}
                    aria-valuetext={e.progress_text}
                  >
                    <span
                      className={s.fill}
                      style={{ inlineSize: `${e.progress * 100}%` }}
                    />
                  </span>
                  <span className={`${s.sub} mono`}>
                    {e.validated_findings} de {e.total_findings}
                  </span>
                </td>
                <td className={s.actions}>
                  <Link className={s.secondary} to={`/executions/${e.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
