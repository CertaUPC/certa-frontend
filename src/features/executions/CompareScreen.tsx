/* Qué cambió entre dos corridas del mismo proyecto.
 *
 * Se compara por huella y no por archivo y línea. La huella se calcula sobre
 * el contenido, de modo que un hallazgo se reconoce como el mismo aunque el
 * código se haya movido: sin eso, meter una importación arriba del archivo
 * haría aparecer como nuevos a todos los hallazgos de ese archivo, y la
 * comparación no serviría para nada.
 */

import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type ChangedFinding, type Execution } from "../../shared/api";
import { EXECUTIONS } from "../../shared/fixtures";
import { Empty, Failed, Loading } from "../../shared/States";
import { useApi } from "../../shared/useApi";
import s from "./CompareScreen.module.css";

type Grupo = "nuevos" | "resueltos" | "siguen";

const GRUPOS: { clave: Grupo; rotulo: string; dice: string }[] = [
  {
    clave: "nuevos",
    rotulo: "Aparecen",
    dice: "No estaban en la corrida anterior. Es lo que entró con los cambios.",
  },
  {
    clave: "resueltos",
    rotulo: "Desaparecen",
    dice: "Estaban antes y ya no. O se corrigieron, o el código que las producía se fue.",
  },
  {
    clave: "siguen",
    rotulo: "Siguen ahí",
    dice: "En las dos corridas. Si alguna se dio por atendida, no lo está.",
  },
];

export function CompareScreen() {
  const { id = "" } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const contra = params.get("against") ?? "";

  const ejecuciones = useApi(() => api.executions(), EXECUTIONS);
  const esta = ejecuciones.data?.find((e) => e.id === id) ?? null;

  const hermanas = useMemo(
    () =>
      (ejecuciones.data ?? []).filter(
        (e) => e.project_id === esta?.project_id && e.id !== id,
      ),
    [ejecuciones.data, esta, id],
  );

  return (
    <>
      <p className={s.crumb}>
        <Link to="/executions">Ejecuciones</Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <Link to={`/executions/${id}`}>
          <span className="mono">{id.slice(0, 8)}</span>
        </Link>{" "}
        <span aria-hidden="true">/</span> Comparar
      </p>

      <h1 className={s.title}>
        Qué cambió en {esta?.project_name || "este proyecto"}
      </h1>
      <p className={s.lead}>
        Se comparan las huellas, que se calculan sobre el contenido del
        hallazgo. Un hallazgo que se movió de línea se reconoce como el mismo.
      </p>

      {ejecuciones.loading && <Loading what="las ejecuciones" />}
      {ejecuciones.error && (
        <Failed message={ejecuciones.error} onRetry={ejecuciones.reload} />
      )}

      {ejecuciones.data && (
        <Selector
          esta={esta}
          hermanas={hermanas}
          contra={contra}
          onElegir={(v) => setParams(v ? { against: v } : {})}
        />
      )}

      {ejecuciones.data && contra && <Resultado id={id} contra={contra} />}
    </>
  );
}

function Selector({
  esta,
  hermanas,
  contra,
  onElegir,
}: {
  esta: Execution | null;
  hermanas: Execution[];
  contra: string;
  onElegir: (id: string) => void;
}) {
  if (hermanas.length === 0) {
    return (
      <Empty title="Este proyecto solo tiene una corrida">
        <p>
          Comparar exige dos. Carga otro informe SARIF del mismo proyecto y
          vuelve.
        </p>
        <Link className={s.boton} to="/executions/new">
          Cargar otro SARIF
        </Link>
      </Empty>
    );
  }

  return (
    <div className={s.selector}>
      <span className={s.fija}>
        <span className={s.fijaRotulo}>Esta corrida</span>
        <span className={`${s.fijaId} mono`}>{esta?.id.slice(0, 8)}</span>
        <span className={s.fijaDato}>
          {esta?.total_findings} hallazgos · {cuando(esta?.created_at)}
        </span>
      </span>

      <span className={s.versus} aria-hidden="true">
        frente a
      </span>

      <label className={s.elegir}>
        <span className="solo-lectores">Corrida con la que comparar</span>
        <select value={contra} onChange={(e) => onElegir(e.target.value)}>
          <option value="">Elige una corrida…</option>
          {hermanas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.id.slice(0, 8)} · {e.total_findings} hallazgos ·{" "}
              {cuando(e.created_at)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Resultado({ id, contra }: { id: string; contra: string }) {
  const [abierto, setAbierto] = useState<Grupo | null>("nuevos");
  const comp = useApi(() => api.compare(id, contra), null, [id, contra]);

  if (comp.loading) return <Loading what="la comparación" />;
  if (comp.error)
    return <Failed message={comp.error} onRetry={comp.reload} />;
  if (!comp.data) return null;

  const datos = comp.data;

  /* Cero en común, con hallazgos en las dos: la huella incluye la ruta del
     archivo tal como la emitió el analizador, así que dos corridas lanzadas
     desde carpetas distintas producen huellas distintas para el mismo
     hallazgo. Decirlo vale más que enseñar dos columnas llenas y una a cero,
     que se lee como si el proyecto entero hubiera cambiado. */
  const sinSolape =
    datos.siguen.length === 0 &&
    datos.nuevos.length > 0 &&
    datos.resueltos.length > 0;

  return (
    <>
      {sinSolape && (
        <p className={s.aviso}>
          <b>Las dos corridas no comparten ni una huella.</b> Suele significar
          que el analizador se lanzó desde carpetas distintas: la huella
          incluye la ruta del archivo tal como el informe la trae, de modo que{" "}
          <span className="mono">corpus/src/…</span> y{" "}
          <span className="mono">../../corpus/src/…</span> son dos hallazgos
          para el sistema. Vuelve a analizar desde la misma carpeta y compara
          otra vez.
        </p>
      )}

      <div className={s.marcadores}>
        {GRUPOS.map((g) => (
          <button
            key={g.clave}
            type="button"
            className={s.marcador}
            data-clave={g.clave}
            aria-pressed={abierto === g.clave}
            onClick={() => setAbierto(abierto === g.clave ? null : g.clave)}
          >
            <span className={`${s.cuenta} mono`}>{datos[g.clave].length}</span>
            <span className={s.rotulo}>{g.rotulo}</span>
            <span className={s.dice}>{g.dice}</span>
          </button>
        ))}
      </div>

      {abierto && <Tabla filas={datos[abierto]} />}
    </>
  );
}

function Tabla({ filas }: { filas: ChangedFinding[] }) {
  if (filas.length === 0) {
    return <p className={s.vacio}>Ninguno en este grupo.</p>;
  }
  return (
    <table className={s.tabla}>
      <thead>
        <tr>
          <th>Archivo</th>
          <th>Regla</th>
          <th>Debilidad</th>
          <th>Severidad</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.fingerprint}>
            <td className="mono">
              {f.file_path.split("/").pop()}:{f.start_line}
            </td>
            <td className="mono" translate="no">
              {f.rule_id}
            </td>
            <td className="mono">{f.cwe ?? "sin categoría"}</td>
            <td>{f.severity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function cuando(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  });
}
