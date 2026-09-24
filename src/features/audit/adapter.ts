/* Del vocabulario del servicio al de la pantalla.
 *
 * Aparte de ambos: el servicio habla de reglas, huellas y líneas citadas; la
 * pantalla, en las palabras de quien revisa.
 *
 * Lo que el servicio no da queda vacío y la pantalla lo omite. Rellenarlo con
 * un valor plausible metería en la medición algo que nadie afirmó.
 */

import type { ApiContext, ApiFinding } from "../../shared/api";
import type { CitedLine, Lang } from "./CodeViewer";
import type { Finding, Verdict } from "./data";

const CWE_NAME: Record<string, string> = {
  "CWE-22": "Ruta manipulable",
  "CWE-78": "Orden del sistema con dato ajeno",
  "CWE-79": "Texto sin escapar",
  "CWE-89": "Inyección SQL",
  "CWE-90": "Inyección en el directorio",
  "CWE-327": "Cifrado desaconsejado",
  "CWE-502": "Deserialización insegura",
  "CWE-611": "Entidad externa de XML",
  "CWE-643": "Inyección en consulta XPath",
};

const SEVERITY: Record<string, string> = {
  error: "alta",
  warning: "media",
  note: "baja",
  none: "informativa",
};

const VERDICT: Record<string, Verdict> = {
  explotable: "real",
  no_explotable: "descartado",
  no_verificable: "revisar",
  indeterminado: "revisar",
};

const EXTENSION: Record<string, Lang> = {
  java: "java",
  py: "python",
  cs: "csharp",
  php: "php",
  sql: "sql",
  js: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
};

/** El lenguaje que el resaltador sabe pintar, o Java si no reconoce la extensión. */
export function langOf(filePath: string): Lang {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION[ext] ?? "java";
}

export function fileNameOf(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

/* El contexto trae el número delante de cada renglón, que es como el modelo lo
 * vio. La canaleta ya numera, así que aquí sobra. */
export function stripLineNumbers(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*\d+:\s?/, ""))
    .join("\n");
}

/* La primera línea citada es por donde entra el dato y la última donde ocurre
 * el problema. Es una lectura del orden, no algo que el modelo afirme, así que
 * con una sola línea no se distingue nada. */
function roles(cited: number[]): CitedLine[] {
  const orden = [...new Set(cited)].sort((a, b) => a - b);
  if (orden.length === 0) return [];
  if (orden.length === 1) return [{ line: orden[0], role: "ocurre" }];
  return orden.map((line, i) => ({
    line,
    role: i === 0 ? "entra" : i === orden.length - 1 ? "ocurre" : "pasa",
  }));
}

/** Título en las palabras de quien revisa, no en las de la regla. */
function titleOf(f: ApiFinding): string {
  if (f.message && f.message.trim()) return f.message.trim();
  const nombre = f.cwe ? CWE_NAME[f.cwe.toUpperCase()] : undefined;
  return nombre ?? f.rule_id;
}

export function toFinding(f: ApiFinding, ctx: ApiContext | null): Finding {
  const v = f.verdict;
  const texto = ctx?.text ?? null;

  return {
    id: f.id,
    title: titleOf(f),
    file: fileNameOf(f.file_path),
    line: f.start_line,
    cwe: f.cwe ?? "sin categoría",
    cweName: f.cwe ? CWE_NAME[f.cwe.toUpperCase()] ?? "" : "",
    severity: SEVERITY[f.severity.toLowerCase()] ?? f.severity,
    fingerprint: f.fingerprint.slice(0, 12),
    verdict: v ? VERDICT[v.value] ?? "revisar" : "sin_analizar",
    confidence: v?.confidence ?? null,
    reason: v?.justification ?? "",
    anchored: v?.anchor_verified ?? false,
    attempts: v?.attempts ?? 0,
    citedCount: v?.cited_lines.length ?? 0,
    stability: f.stability ?? null,
    priorityReason: f.priority_reason ?? "",
    code: texto ? stripLineNumbers(texto) : "",
    lang: langOf(f.file_path),
    firstLine: ctx?.first_line ?? f.start_line,
    cited: roles(v?.cited_lines ?? []),
    enclosing: ctx?.enclosing_function ?? "",
    callers: ctx?.callers ?? [],
  };
}
