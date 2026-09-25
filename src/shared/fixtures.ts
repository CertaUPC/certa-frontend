/* Datos de muestra con la forma exacta de las respuestas reales.
 *
 * Para poder recorrer la aplicación sin servicio levantado. Se marcan como
 * muestra en la interfaz: nunca se presentan como resultados.
 */

import type { Execution, Metrics, Participant, Project } from "./api";

export const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "OWASP Benchmark",
    language: "java",
    repository_path: "/repos/owasp-benchmark",
    is_public_dataset: true,
    execution_count: 2,
    created_at: "2026-09-01T09:00:00Z",
  },
  {
    id: "p2",
    name: "Juliet Test Suite, CWE-89",
    language: "java",
    repository_path: "/repos/juliet-cwe89",
    is_public_dataset: true,
    execution_count: 1,
    created_at: "2026-09-03T09:00:00Z",
  },
];

export const EXECUTIONS: Execution[] = [
  {
    id: "7f3a2b10",
    label: "Corrida de referencia, reglas 1.95",
    project_id: "p1",
    project_name: "OWASP Benchmark",
    tool_name: "semgrep",
    ruleset_version: "1.95.0",
    status: "completada",
    total_findings: 41,
    validated_findings: 41,
    pending_findings: 0,
    progress: 1,
    progress_text: "41 de 41 hallazgos validados (100 %), 0 pendientes",
    failure_reason: null,
    claimed_by: "certa-worker",
    started_at: "2026-09-09T14:22:00Z",
    last_attempt_note: null,
    last_attempt_at: null,
    created_at: "2026-09-09T14:20:00Z",
  },
  {
    id: "c81d94f2",
    label: "Primer barrido de CWE-89",
    project_id: "p2",
    project_name: "Juliet Test Suite, CWE-89",
    tool_name: "semgrep",
    ruleset_version: "1.95.0",
    status: "en_proceso",
    total_findings: 128,
    validated_findings: 76,
    pending_findings: 52,
    progress: 0.594,
    progress_text: "76 de 128 hallazgos validados (59 %), 52 pendientes",
    failure_reason: null,
    claimed_by: "certa-worker",
    started_at: "2026-09-10T09:06:00Z",
    last_attempt_note: null,
    last_attempt_at: null,
    created_at: "2026-09-10T09:05:00Z",
  },
  {
    id: "a4e077bc",
    label: "Prueba con presupuesto corto",
    project_id: "p1",
    project_name: "OWASP Benchmark",
    tool_name: "semgrep",
    ruleset_version: "1.94.0",
    status: "fallida",
    total_findings: 41,
    validated_findings: 12,
    pending_findings: 29,
    progress: 0.293,
    progress_text: "12 de 41 hallazgos validados (29 %), 29 pendientes",
    failure_reason:
      "Se alcanzó el límite de 30 consultas. Lo validado se conserva y el resto queda pendiente.",
    claimed_by: null,
    started_at: "2026-09-08T16:41:00Z",
    last_attempt_note: null,
    last_attempt_at: null,
    created_at: "2026-09-08T16:40:00Z",
  },
  {
    id: "b2f5109e",
    label: null,
    project_id: "p3",
    project_name: "Repositorio de prueba interno",
    tool_name: "semgrep",
    ruleset_version: "1.95.0",
    status: "pendiente",
    total_findings: 7,
    validated_findings: 0,
    pending_findings: 7,
    progress: 0,
    progress_text: "0 de 7 hallazgos validados (0 %), 7 pendientes",
    failure_reason: null,
    claimed_by: null,
    started_at: null,
    // La corrida que rebota: el trabajador la toma, no encuentra el código y
    // la devuelve. Sin la nota se vería igual que una recién cargada.
    last_attempt_note:
      "El único hallazgo que se intentó se quedó sin contexto recuperable, y " +
      "ninguno se validó. El repositorio no parece estar donde este trabajador " +
      "lo busca, así que la ejecución vuelve a la cola sin consumirse. No se " +
      "pudo recuperar el contexto: No existe el repositorio en /repos/portal. " +
      "Se buscaba src/main/java/Login.java dentro de él.",
    last_attempt_at: "2026-09-10T11:53:20Z",
    created_at: "2026-09-10T11:52:00Z",
  },
];

export const METRICS: Record<string, Metrics> = {
  "7f3a2b10": {
    execution_id: "7f3a2b10",
    total_verdicts: 41,
    confusion: {
      verdaderos_positivos: 16,
      falsos_positivos: 3,
      verdaderos_negativos: 19,
      falsos_negativos: 3,
      exactitud: 0.8537,
      precision: 0.8421,
      exhaustividad: 0.8421,
      f1: 0.8421,
      tasa_falsos_positivos: 0.1364,
    },
    anchor_rate_first_try: 0.9024,
    run_is_valid: true,
    run_quality_reason:
      "Distribución admisible, la clase mayoritaria cubre el 53.7 %",
    budget: "41 de 3000 consultas empleadas (US$ 0.68). 9 evitadas: 6 por huella repetida y 3 por filtro determinista.",
  },
};

/* Las bandas son las del anexo B, que son cuatro. Las de antes, «inicial»,
   «intermedio» y «senior», las derivaba el modelo de un entero de años que ya
   no se pregunta. */
export const PARTICIPANTS: Participant[] = [
  {
    participant_id: "u1",
    anonymous_code: "P-01",
    experience_band: "de_1_a_3",
    is_pilot: false,
    order: ["con_asistente", "sin_asistente"],
    first_batch: "A",
    second_batch: "B",
  },
  {
    participant_id: "u2",
    anonymous_code: "P-02",
    experience_band: "mas_de_7",
    is_pilot: false,
    order: ["sin_asistente", "con_asistente"],
    first_batch: "B",
    second_batch: "A",
  },
  {
    participant_id: "u3",
    anonymous_code: "ENS-01",
    experience_band: "menos_de_1",
    is_pilot: true,
    order: ["con_asistente", "sin_asistente"],
    first_batch: "A",
    second_batch: "B",
  },
];

export const STATUS_LABEL: Record<Execution["status"], string> = {
  pendiente: "En espera",
  en_proceso: "Procesando",
  completada: "Terminada",
  fallida: "Interrumpida",
};
