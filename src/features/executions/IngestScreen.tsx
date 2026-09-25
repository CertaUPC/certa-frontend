/* El proyecto va antes que el archivo porque es lo que agrupa las ejecuciones.
 * Si no existe se crea aquí mismo, para no tener que salir a mitad de camino.
 *
 * Son dos pasos obligatorios y uno opcional. El opcional va plegado: abierto
 * ocupa media pantalla y empuja el botón de cargar fuera de la vista, de modo
 * que la pantalla parece pedir cinco decisiones cuando pide dos. */

import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, USE_FIXTURES } from "../../shared/api";
import { PROJECTS } from "../../shared/fixtures";
import { useAction, useApi } from "../../shared/useApi";
import { Failed, Loading } from "../../shared/States";
import s from "./IngestScreen.module.css";

const NUEVO = "__nuevo__";

const SEVERITIES = [
  { value: "", label: "Cualquiera" },
  { value: "note", label: "Baja o superior" },
  { value: "warning", label: "Media o superior" },
  { value: "error", label: "Solo alta" },
];

const COMMON_CWES = [
  { id: "CWE-89", name: "Inyección SQL" },
  { id: "CWE-79", name: "Texto sin escapar" },
  { id: "CWE-611", name: "Entidad externa de XML" },
  { id: "CWE-22", name: "Ruta manipulable" },
  { id: "CWE-502", name: "Deserialización insegura" },
];

export function IngestScreen() {
  const navigate = useNavigate();
  const proyectos = useApi(() => api.projects(), PROJECTS);

  const [projectId, setProjectId] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState("");
  const [cwes, setCwes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const enviar = useAction(async () => {
    if (!file) throw new Error("Falta el archivo");

    let destino = projectId;
    if (destino === NUEVO) {
      const creado = await api.createProject(
        nuevoNombre.trim(),
        nuevaRuta.trim() || nuevoNombre.trim(),
      );
      destino = creado.id;
    }

    const texto = await file.text();
    let sarif: unknown;
    try {
      sarif = JSON.parse(texto);
    } catch {
      throw new Error(
        "El archivo no es JSON válido. SARIF es un documento JSON: comprueba " +
          "que sea la salida del analizador y no un informe en otro formato.",
      );
    }

    const informe = await api.ingest(destino, sarif, {
      cwes,
      min_severity: severity || null,
    });
    return informe;
  });

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !f.name.toLowerCase().endsWith(".sarif") && !f.name.toLowerCase().endsWith(".json")) {
      setError("El archivo debe ser SARIF, con extensión .sarif o .json.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  function toggleCwe(id: string) {
    setCwes((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function cargar() {
    if (USE_FIXTURES) {
      navigate("/executions/7f3a2b10");
      return;
    }
    const informe = await enviar.run();
    if (informe) navigate(`/executions/${informe.execution.id}`);
  }

  const sinFiltro = !severity && cwes.length === 0;
  const proyectoListo =
    projectId === NUEVO ? nuevoNombre.trim().length > 0 : projectId.length > 0;
  const listo = Boolean(file) && proyectoListo && !enviar.busy;

  if (proyectos.loading) return <Loading what="los proyectos" />;
  if (proyectos.error) {
    return <Failed message={proyectos.error} onRetry={proyectos.reload} />;
  }
  const lista = proyectos.data ?? [];

  return (
    <>
      <p className={s.crumb}>
        <Link to="/executions">Ejecuciones</Link> <span aria-hidden="true">/</span> Nueva
      </p>

      <h1 className={s.title}>Cargar un archivo SARIF</h1>
      <p className={s.lead}>
        Certa no busca fallas: trabaja con las que ya encontró tu analizador.
        SARIF es el archivo donde ese analizador deja sus alertas.
      </p>

      <div className={s.form}>
        <section className={s.block}>
          <h2 className={s.h2}>
            <span className={s.step}>1</span> Proyecto
          </h2>
          <select
            className={s.input}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Elige un proyecto</option>
            {lista.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.execution_count > 0 ? ` (${p.execution_count} ejecuciones)` : ""}
              </option>
            ))}
            <option value={NUEVO}>Crear uno nuevo</option>
          </select>

          {projectId === NUEVO && (
            <>
              <label className={s.field}>
                <span>Nombre</span>
                <input
                  className={s.input}
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="OWASP Benchmark"
                />
              </label>
              <label className={s.field}>
                <span>Ruta del repositorio</span>
                <input
                  className={s.input}
                  value={nuevaRuta}
                  onChange={(e) => setNuevaRuta(e.target.value)}
                  placeholder="/repos/owasp-benchmark"
                />
              </label>
              <p className={s.note}>
                La ruta identifica al proyecto. Si repites una, se reusa el
                proyecto que ya existe en vez de duplicarlo.
              </p>
            </>
          )}
        </section>

        <section className={s.block}>
          <h2 className={s.h2}>
            <span className={s.step}>2</span> Archivo
          </h2>
          <label className={file ? `${s.drop} ${s.filled}` : s.drop}>
            <input type="file" accept=".sarif,.json,application/json" onChange={pick} />
            {file ? (
              <>
                <span className={s.fileName}>{file.name}</span>
                <span className={s.fileSize}>{(file.size / 1024).toFixed(0)} KB</span>
              </>
            ) : (
              <>
                <span className={s.dropTitle}>Elige el archivo SARIF</span>
                <span className={s.dropHint}>Extensión .sarif o .json</span>
              </>
            )}
          </label>
          {error && <p className={s.error}>{error}</p>}
        </section>

        <details className={s.optional}>
          <summary className={s.optionalTitle}>
            Acotar qué se procesa
            <span className={s.optionalTag}>opcional</span>
          </summary>

          <p className={s.note}>
            Dejar fuera lo que hoy no vas a atender ahorra tiempo y consultas al
            modelo.
          </p>

          <label className={s.field}>
            <span>Severidad mínima</span>
            <select
              className={s.input}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <span className={s.fieldLabel}>
            Categorías <span className={s.gloss}>tipos de falla, por su número CWE</span>
          </span>
          <div className={s.chips}>
            {COMMON_CWES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={s.cweChip}
                aria-pressed={cwes.includes(c.id)}
                onClick={() => toggleCwe(c.id)}
              >
                <span className="mono">{c.id}</span> {c.name}
              </button>
            ))}
          </div>
        </details>

        {enviar.error && <p className={s.error}>{enviar.error}</p>}

        {/* Lo que va a pasar al pulsar, dicho antes de pulsar y fuera del
            bloque plegable: si estuviera dentro, plegarlo escondería el único
            sitio donde se lee que el filtro sigue puesto. */}
        <p className={s.summary}>
          {sinFiltro
            ? "Se procesarán todos los hallazgos del archivo."
            : `Se procesarán solo los que cumplan: ${[
                cwes.length ? cwes.join(", ") : null,
                severity ? `severidad ${SEVERITIES.find((x) => x.value === severity)?.label.toLowerCase()}` : null,
              ].filter(Boolean).join("; ")}.`}
        </p>

        <div className={s.actions}>
          <button className={s.primary} disabled={!listo} onClick={cargar}>
            {enviar.busy ? "Cargando el archivo…" : "Cargar y crear la ejecución"}
          </button>
          <Link className={s.secondary} to="/executions">Cancelar</Link>
        </div>

        {!listo && !enviar.busy && (
          <p className={s.missing}>
            {!proyectoListo
              ? "Elige el proyecto para continuar."
              : "Falta el archivo SARIF."}
          </p>
        )}
      </div>
    </>
  );
}
