/* Hallazgos de muestra, con la forma que devuelve
 * /api/v1/executions/{id}/findings. */

import type { CitedLine, Lang } from "./CodeViewer";

export type Verdict = "real" | "descartado" | "revisar";

export interface Finding {
  id: string;
  title: string;
  file: string;
  line: number;
  cwe: string;
  cweName: string;
  severity: string;
  fingerprint: string;
  verdict: Verdict;
  confidence: number | null;
  reason: string;
  anchored: boolean;
  attempts: number;
  citedCount: number;
  /** Veredicto igual en cuántas de cuántas corridas con parámetros idénticos. */
  /** Nulo cuando el servicio no informó repeticiones: no se inventa un valor. */
  stability: { agree: number; runs: number } | null;
  priorityReason: string;
  code: string;
  lang: Lang;
  firstLine: number;
  cited: CitedLine[];
  enclosing: string;
  callers: string[];
}

const JAVA_SQLI = `public class UserDao {

    public User findUnsafe(String id) {
        String q = "SELECT * FROM users WHERE id = " + id;
        return jdbc.queryForObject(q, User.class);
    }

    public User handleRequest(HttpRequest req) {
        return findUnsafe(req.getParameter("id"));
    }
}`;

const JAVA_SAFE = `public class OrderDao {

    public Order find(String id) {
        // La consulta viaja con parámetros, el dato nunca se concatena
        String q = "SELECT * FROM orders WHERE id = ?";
        return jdbc.queryForObject(q, new Object[]{ id }, Order.class);
    }
}`;

const JAVA_XML = `public class XmlLoader {

    public Document load(InputStream in) throws Exception {
        DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
        return f.newDocumentBuilder().parse(in);
    }
}`;

export const FINDINGS: Finding[] = [
  {
    id: "f1",
    title: "El dato de la petición llega a la consulta sin revisarse",
    file: "UserDao.java",
    line: 4,
    cwe: "CWE-89",
    cweName: "Inyección SQL",
    severity: "alta",
    fingerprint: "4c1f8ae0b2d7",
    verdict: "real",
    confidence: 0.94,
    reason:
      "El dato entra en la línea 9 y llega igual a la línea 4, donde se junta con el texto de la consulta. Entre una y otra no hay nada que lo revise.",
    anchored: true,
    attempts: 1,
    citedCount: 3,
    stability: { agree: 3, runs: 3 },
    priorityReason: "Parece real, el modelo está muy seguro y la regla es de severidad alta",
    code: JAVA_SQLI,
    lang: "java",
    firstLine: 1,
    cited: [
      { line: 4, role: "ocurre" },
      { line: 5, role: "ocurre" },
      { line: 9, role: "entra" },
    ],
    enclosing: "findUnsafe",
    callers: ["handleRequest"],
  },
  {
    id: "f2",
    title: "El lector de XML acepta entidades externas",
    file: "XmlLoader.java",
    line: 5,
    cwe: "CWE-611",
    cweName: "Entidad externa de XML",
    severity: "alta",
    fingerprint: "9b0e71cc4a12",
    verdict: "revisar",
    confidence: null,
    reason:
      "El modelo citó dos veces líneas que no estaban en el fragmento. Tras el reintento no logró sostener su conclusión, así que su respuesta se descartó y el hallazgo subió en la lista.",
    anchored: false,
    attempts: 2,
    citedCount: 0,
    stability: { agree: 2, runs: 3 },
    priorityReason: "Nadie pudo justificarlo, así que sube por precaución",
    code: JAVA_XML,
    lang: "java",
    firstLine: 1,
    cited: [{ line: 5, role: "ocurre" }],
    enclosing: "load",
    callers: [],
  },
  {
    id: "f3",
    title: "La consulta usa parámetros, el dato no se concatena",
    file: "OrderDao.java",
    line: 6,
    cwe: "CWE-89",
    cweName: "Inyección SQL",
    severity: "alta",
    fingerprint: "2e77b1904fd3",
    verdict: "descartado",
    confidence: 0.88,
    reason:
      "La consulta de la línea 5 lleva un marcador en vez del dato, y la línea 6 lo pasa aparte. El motor nunca interpreta el dato como parte de la instrucción.",
    anchored: true,
    attempts: 1,
    citedCount: 2,
    stability: { agree: 3, runs: 3 },
    priorityReason: "El modelo lo descartó con buena confianza, así que baja en la lista",
    code: JAVA_SAFE,
    lang: "java",
    firstLine: 1,
    cited: [
      { line: 5, role: "pasa" },
      { line: 6, role: "ocurre" },
    ],
    enclosing: "find",
    callers: [],
  },
];

export const VERDICT_LABEL: Record<Verdict, string> = {
  real: "Parece real",
  descartado: "Parece falsa alarma",
  revisar: "Nadie pudo justificarlo",
};

export const VERDICT_SHORT: Record<Verdict, string> = {
  real: "Real",
  descartado: "Descartado",
  revisar: "Revisar",
};

export function confidenceWord(c: number): string {
  if (c >= 0.9) return "muy seguro";
  if (c >= 0.75) return "bastante seguro";
  if (c >= 0.5) return "poco seguro";
  return "nada seguro";
}
