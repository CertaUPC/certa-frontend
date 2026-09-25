import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../shared/api";
import { corto, cuando, titulo } from "../../shared/executions";
import { useProyecto } from "../../shared/project";
import { EXECUTIONS, STATUS_LABEL } from "../../shared/fixtures";
import { Empty, Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import s from "./ExecutionsScreen.module.css";

export function ExecutionsScreen() {
  /* Las del proyecto que la barra tiene elegido. Antes se listaban todas, de
     modo que elegir proyecto en la barra no cambiaba nada aquí. */
  const { actual, elegir } = useProyecto();

  /* Quien llega desde la ficha de un proyecto trae el suyo en la dirección.
     Adoptarlo deja la barra y la lista mirando lo mismo. */
  const [consulta] = useSearchParams();
  const pedido = consulta.get("project");
  useEffect(() => {
    if (pedido && pedido !== actual?.id) elegir(pedido);
  }, [pedido, actual?.id, elegir]);

  /* Comparar se elige aquí, que es donde están las dos corridas a la vista.
     Estaba en la pantalla de una sola, así que había que abrir una, pedir
     comparar y recién entonces buscar la otra en un desplegable. */
  const [elegidas, setElegidas] = useState<string[]>([]);
  function alternar(id: string) {
    setElegidas((v) =>
      v.includes(id)
        ? v.filter((x) => x !== id)
        : // Con dos ya marcadas, la tercera desplaza a la más vieja en vez de
          // no hacer nada, que dejaba al usuario sin saber por qué no pasaba.
          v.length === 2
          ? [v[1], id]
          : [...v, id],
    );
  }

  const { data, loading, error, reload } = useApi(
    () => api.executions(actual?.id),
    // Los de muestra se filtran igual que los de verdad: si no, el título
    // dice un proyecto y la tabla enseña los de todos.
    EXECUTIONS.filter((e) => !actual || e.project_id === actual.id),
    [actual?.id],
  );

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>
            Ejecuciones{actual ? ` de ${actual.name}` : ""}
          </h1>
          <p className={s.lead}>
            Cada ejecución es una pasada del analizador sobre el proyecto.
            Marca dos para ver qué cambió entre ellas.
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

      {/* La barra aparece recién con las dos marcadas, y mientras tanto dice
          qué falta. Un botón apagado sin explicación no enseña nada. */}
      {data && data.length > 1 && elegidas.length > 0 && (
        <div className={s.comparar}>
          {elegidas.length === 2 ? (
            <>
              <span>Dos ejecuciones marcadas.</span>
              <Link
                className={s.primary}
                to={`/executions/${elegidas[0]}/compare?against=${elegidas[1]}`}
              >
                Ver qué cambió entre las dos
              </Link>
            </>
          ) : (
            <span>Marca una segunda ejecución para compararlas.</span>
          )}
          <button className={s.quitar} onClick={() => setElegidas([])}>
            Quitar la marca
          </button>
        </div>
      )}

      {data && data.length > 0 && (
        <table className={s.table}>
          <caption className="solo-lectores">
            Ejecuciones del analizador, con su avance de validación
          </caption>
          <thead>
            <tr>
              {data.length > 1 && <th className={s.marcaCol}>Comparar</th>}
              <th>Ejecución</th>
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
              <tr key={e.id} data-marcada={elegidas.includes(e.id) || undefined}>
                {data.length > 1 && (
                  <td className={s.marcaCol}>
                    <input
                      type="checkbox"
                      className={s.marca}
                      checked={elegidas.includes(e.id)}
                      onChange={() => alternar(e.id)}
                      aria-label={`Comparar ${titulo(e)}`}
                    />
                  </td>
                )}
                <td>
                  <span className={s.project}>{titulo(e)}</span>
                  <span className={s.sub}>
                    {cuando(e.created_at)} · <span className="mono">{corto(e)}</span>
                  </span>
                </td>
                <td className="mono" translate="no">
                  {e.tool_name} {e.ruleset_version}
                </td>
                <td>
                  <span className={`${s.badge} ${s[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                  {e.failure_reason && <span className={s.sub}>{e.failure_reason}</span>}
                  {/* Una corrida que rebota vuelve a «en espera», y sin esto
                      se ve igual que una que aguarda su turno. */}
                  {e.last_attempt_note && (
                    <span className={s.sub} title={e.last_attempt_note}>
                      el último intento no pudo empezar
                    </span>
                  )}
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
