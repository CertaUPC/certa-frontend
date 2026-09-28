/* El proyecto va antes que el archivo porque es lo que agrupa las ejecuciones.
 * Si no existe se crea aquí mismo, para no tener que salir a mitad de camino.
 *
 * Son dos pasos obligatorios y uno opcional. El opcional va plegado: abierto
 * ocupa media pantalla y empuja el botón de cargar fuera de la vista, de modo
 * que la pantalla parece pedir cinco decisiones cuando pide dos. */

import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, USE_FIXTURES } from "../../shared/api";
import { PROJECTS } from "../../shared/fixtures";
import { Hint } from "../../shared/Hint";
import { useProyecto } from "../../shared/project";
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

/* Atajos, no la lista. Son las cinco que más aparecen en los conjuntos con
   verdad conocida; cualquier otra se escribe a mano. */
const CWES_FRECUENTES = [
  { id: "CWE-89", name: "Inyección SQL" },
  { id: "CWE-79", name: "Texto sin escapar" },
  { id: "CWE-78", name: "Comando del sistema" },
  { id: "CWE-22", name: "Ruta manipulable" },
  { id: "CWE-611", name: "Entidad externa de XML" },
  { id: "CWE-502", name: "Deserialización insegura" },
  { id: "CWE-918", name: "Destino que viene del usuario" },
  { id: "CWE-352", name: "Petición falsificada" },
  { id: "CWE-327", name: "Criptografía débil" },
  { id: "CWE-798", name: "Credencial en el código" },
  { id: "CWE-732", name: "Permisos demasiado abiertos" },
  { id: "CWE-532", name: "Dato sensible en la bitácora" },
];

/** Acepta «352», «cwe 352» o «CWE-352», que es como la gente lo escribe. */
function normalizarCwe(texto: string): string | null {
  const numero = texto.trim().replace(/^cwe[\s-]*/i, "");
  return /^[0-9]{1,5}$/.test(numero) ? `CWE-${numero}` : null;
}

export function IngestScreen() {
  const navigate = useNavigate();
  const proyectos = useApi(() => api.projects(), PROJECTS);

  /* Quien llega aquí desde la barra ya venía trabajando en un proyecto.
     Volver a preguntárselo era pedirle dos veces lo mismo. */
  const { actual, recargar, elegir } = useProyecto();
  const [projectId, setProjectId] = useState("");
  useEffect(() => {
    if (!projectId && actual) setProjectId(actual.id);
  }, [actual, projectId]);

  const [otroCwe, setOtroCwe] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
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
      // Igual que al crearlo desde Proyectos: la barra tiene su lista propia
      // y el recién creado no está en ella hasta que vuelve a preguntar.
      recargar();
      elegir(creado.id);
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

    const informe = await api.ingest(
      destino,
      sarif,
      { cwes, min_severity: severity || null },
      nombre,
    );
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
    /* El archivo ya trae un nombre que quien lo eligió reconoce. Proponerlo
       ahorra escribirlo, y se puede cambiar antes de cargar. */
    if (f && !nombre.trim()) setNombre(f.name.replace(/\.(sarif|json)$/i, ""));
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

      <h1 className={s.title}>
        Cargar un archivo SARIF
        <Hint termino="SARIF">
          Es el formato en que los analizadores de código escriben lo que
          encontraron: un archivo de texto con una entrada por alerta, su
          archivo, su línea y la regla que saltó. Semgrep, CodeQL y casi
          cualquier analizador de hoy lo saben escribir, normalmente con una
          opción como «--sarif».
        </Hint>
      </h1>
      <p className={s.lead}>
        Certa no busca fallas: trabaja con las que ya encontró tu analizador.
      </p>

      <div className={s.lienzo}>
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
                {p.execution_count > 0
                  ? ` (${p.execution_count} ${
                      p.execution_count === 1 ? "ejecución" : "ejecuciones"
                    })`
                  : ""}
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
              <p className={s.note}>
                <b>Dónde tiene que estar el código.</b> Quien analiza no es
                esta pantalla sino un proceso aparte, que lee los archivos de
                su propio disco. Si corres Certa en tu máquina, pon la ruta
                absoluta de tu copia del repositorio. Si usas el servicio
                desplegado, tiene que ser una carpeta que ese proceso tenga
                delante; si no la encuentra, la ejecución vuelve a la cola y lo
                dice con la ruta exacta que intentó.
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

          {/* Sin nombre, la corrida se llama por su fecha. Con dos del mismo
              día eso ya no alcanza para distinguirlas. */}
          {/* La explicación va detrás del icono y no en un párrafo: son dos
              renglones que empujan el botón de cargar fuera de la vista en una
              ventana de portátil. */}
          <label className={s.field}>
            <span>
              Nombre de la ejecución (opcional){" "}
              <Hint termino="el nombre de la ejecución">
                Sirve para ubicarla después entre varias. Si lo dejas vacío, se
                llamará por su fecha y su hora.
              </Hint>
            </span>
            <input
              className={s.input}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Barrido del viernes, reglas 1.95"
              maxLength={120}
            />
          </label>
        </section>

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

        {/* El motivo aparece cuando ya elegiste algo, no al entrar: la
            pantalla te recibía diciendo que falta el archivo antes de que
            tuvieras ocasión de ponerlo. */}
        {!listo && !enviar.busy && proyectoListo && (
          <p className={s.missing}>
            {"Elige el archivo SARIF para continuar."}
          </p>
        )}
      </div>

        {/* Al costado, y no debajo: la pantalla dejaba novecientos píxeles de
            ancho vacíos, y quien carga por primera vez no sabe qué va a pasar
            después de pulsar. */}
        <aside className={s.lado}>
          <h2 className={s.h2Aparte}>Qué pasa después</h2>
          <ol className={s.pasos}>
            <li>
              La ejecución queda creada y entra en cola. Puedes cerrar la
              ventana.
            </li>
            <li>
              El asistente juzga cada alerta y explica por qué, citando las
              líneas del código en las que se apoya.
            </li>
            <li>
              Cuando termina, revisas la lista ya ordenada: lo que parece real,
              primero.
            </li>
          </ol>
          <p className={s.pasosPie}>
            Tarda entre diez y veinticinco segundos por alerta, así que un
            archivo grande son horas.
          </p>

          {/* El alcance vive aquí y no debajo del formulario: abierto medía
              setecientos píxeles y empujaba el botón de cargar fuera de la
              pantalla, mientras este costado se quedaba vacío. */}
          <details className={s.optional}>
            <summary className={s.optionalTitle}>
              <span className={s.step}>3</span> Acotar qué se procesa
              <span className={s.optionalTag}>opcional</span>
            </summary>

            <p className={s.note}>
              Dejar fuera lo que hoy no vas a atender ahorra tiempo y consultas
              al asistente.
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
              Tipos de falla{" "}
              <Hint termino="los tipos de falla y su número CWE">
                CWE es un catálogo público de tipos de falla. Cada tipo tiene
                su número, y las reglas del analizador lo traen puesto: CWE-89
                es inyección SQL, CWE-79 es texto sin escapar en la página.
                Acotar por uno deja fuera todo lo que no sea de ese tipo.
              </Hint>
            </span>
            <div className={s.chips}>
              {CWES_FRECUENTES.map((c) => (
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
              {/* Los cinco de arriba son atajos. Sin esto, la pantalla parecía
                  decir que solo existen cinco tipos de falla. */}
              {cwes
                .filter((id) => !CWES_FRECUENTES.some((c) => c.id === id))
                .map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={s.cweChip}
                    aria-pressed
                    onClick={() => toggleCwe(id)}
                  >
                    <span className="mono">{id}</span> quitar
                  </button>
                ))}
            </div>
            <div className={s.otroCwe}>
              <label className={s.field}>
                <span className="solo-lectores">Agregar otro número CWE</span>
                <input
                  className={s.input}
                  value={otroCwe}
                  onChange={(e) => setOtroCwe(e.target.value)}
                  placeholder="CWE-190, o el que necesites"
                />
              </label>
              <button
                type="button"
                className={s.agregar}
                disabled={!normalizarCwe(otroCwe)}
                onClick={() => {
                  const id = normalizarCwe(otroCwe);
                  if (!id) return;
                  if (!cwes.includes(id)) toggleCwe(id);
                  setOtroCwe("");
                }}
              >
                Agregar
              </button>
            </div>
          </details>

        </aside>
      </div>
    </>
  );
}
