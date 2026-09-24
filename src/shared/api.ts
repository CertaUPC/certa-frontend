/* Cliente de la API. Con `USE_FIXTURES` devuelve datos de muestra de la misma
 * forma que las respuestas reales: ningún componente sabe de dónde vienen. */

// Solo con la marca puesta a mano. Si faltara la variable, mostrar datos de
// muestra como si fueran reales sería peor que fallar la conexión.
export const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === "true";

// La dirección del servicio se fija al compilar. En desarrollo cae al servicio
// local; en el paquete distribuible no hay valor por omisión posible, porque
// apuntar a localhost desde el navegador de otra persona falla con un error de
// red que parece una caída del servicio.
const BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const TOKEN_KEY = "certa.token";
const ROLE_KEY = "certa.role";

export type Role = "desarrollador" | "investigador" | "lider_tecnico";

export const ROLE_LABEL: Record<Role, string> = {
  desarrollador: "Desarrollador",
  investigador: "Investigador",
  lider_tecnico: "Líder técnico",
};

export function getToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function getRole(): Role | null {
  try { return sessionStorage.getItem(ROLE_KEY) as Role | null; } catch { return null; }
}
export function saveSession(token: string, role: Role): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
  } catch { /* sesión privada: se opera igual, sin recordar */ }
}
export function clearSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  } catch { /* nada que limpiar */ }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) {
    throw new ApiError(
      0,
      "Esta compilación no tiene configurada la dirección del servicio. " +
        "Falta VITE_API_URL en el entorno de construcción.",
    );
  }
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detalle = `El servicio respondió ${res.status}`;
    try {
      const cuerpo = await res.json();
      if (cuerpo?.detail) detalle = String(cuerpo.detail);
    } catch { /* la respuesta no traía cuerpo interpretable */ }
    throw new ApiError(res.status, detalle);
  }
  return res.json() as Promise<T>;
}

/* ── formas de respuesta, espejo de los esquemas del servicio ───────── */

export type ExecutionStatus = "pendiente" | "en_proceso" | "completada" | "fallida";

export interface Execution {
  id: string;
  project_id: string;
  project_name: string;
  tool_name: string;
  ruleset_version: string;
  status: ExecutionStatus;
  total_findings: number;
  validated_findings: number;
  pending_findings: number;
  progress: number;
  progress_text: string;
  failure_reason: string | null;
  created_at: string;
}

export interface Metrics {
  execution_id: string;
  total_verdicts: number;
  confusion: Record<string, number>;
  anchor_rate_first_try: number;
  run_is_valid: boolean;
  run_quality_reason: string;
  budget: string;
}

export interface Participant {
  participant_id: string;
  anonymous_code: string;
  experience_band: string;
  order: string[];
  first_batch: string;
  second_batch: string;
}

export interface Project {
  id: string;
  name: string;
  language: string;
  repository_path: string;
  is_public_dataset: boolean;
  execution_count: number;
  created_at: string;
}

export interface ApiVerdict {
  model: string;
  model_version: string;
  value: string;
  confidence: number | null;
  anchor_verified: boolean;
  attempts: number;
  reused: boolean;
  justification: string | null;
  cited_lines: number[];
}

/** Cuántas veces se preguntó lo mismo y en cuántas coincidió la respuesta. */
export interface ApiStability {
  runs: number;
  agree: number;
}

export interface ApiFinding {
  id: string;
  rule_id: string;
  cwe: string | null;
  severity: string;
  file_path: string;
  start_line: number;
  end_line: number;
  message: string | null;
  fingerprint: string;
  priority: number | null;
  priority_reason: string | null;
  verdict: ApiVerdict | null;
  stability: ApiStability | null;
}

export interface ApiContext {
  enclosing_function: string;
  first_line: number;
  callers: string[];
  sanitizers: string[];
  degraded_to_file: boolean;
  recovered_lines: number;
  text: string | null;
}

export interface IngestReport {
  execution: Execution;
  ingested: number;
  filtered_out: number;
  skipped: string[];
  message: string;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; role: Role }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /* La entrada del participante a su sesión, con el código que quien dirige
     el estudio le dicta. No lleva contraseña: el consentimiento promete que
     no se recoge nada que le identifique, y darle una cuenta lo incumpliría.
     Lo que controla el acceso es que su credencial de participación esté
     emitida y dentro de su ventana. */
  participantAccess: (anonymousCode: string) =>
    request<{
      access_token: string;
      participant_id: string;
      order: string[];
      first_batch: string;
      second_batch: string;
      execution_id: string | null;
    }>("/api/v1/auth/participant", {
      method: "POST",
      body: JSON.stringify({ anonymous_code: anonymousCode }),
    }),

  executions: () => request<Execution[]>("/api/v1/executions"),

  execution: (id: string) => request<Execution>(`/api/v1/executions/${id}`),

  ingest: (
    projectId: string,
    sarif: unknown,
    scope?: { cwes: string[]; min_severity: string | null },
  ) =>
    request<IngestReport>("/api/v1/executions", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, sarif, scope }),
    }),

  run: (id: string) =>
    request<{ validated: number; failed: number; interrupted: boolean; interruption_reason: string | null; budget: string }>(
      `/api/v1/executions/${id}/run`, { method: "POST" },
    ),

  metrics: (id: string) =>
    request<Metrics>(`/api/v1/experiment/executions/${id}/metrics`),

  listParticipants: () => request<Participant[]>("/api/v1/experiment/participants"),

  registerParticipant: (code: string, years: number) =>
    request<Participant>("/api/v1/experiment/participants", {
      method: "POST",
      body: JSON.stringify({ anonymous_code: code, years_of_experience: years, consented: true }),
    }),

  projects: () => request<Project[]>("/api/v1/projects"),

  createProject: (name: string, repositoryPath: string, language = "java") =>
    request<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({
        name,
        repository_path: repositoryPath,
        language,
      }),
    }),

  findings: (executionId: string) =>
    request<ApiFinding[]>(`/api/v1/executions/${executionId}/findings`),

  context: (findingId: string) =>
    request<ApiContext>(`/api/v1/executions/findings/${findingId}/context`),

  /* El lote congelado de la sesión. Sin esto la pantalla serviría la ejecución
     entera y el participante vería el corpus en vez de los doce que le tocan. */
  /* Con qué presentación resolvió la tarea. Se envía una sola vez, al fijarse
     el tema, para que el análisis pueda descartarlo como factor. */
  recordTheme: (participantId: string, theme: "light" | "dark") =>
    request<{ participant_id: string; theme: string }>(
      "/api/v1/experiment/sessions/theme",
      {
        method: "POST",
        body: JSON.stringify({ participant_id: participantId, theme }),
      },
    ),

  batchFindings: (batch: string) =>
    request<{ lote: string; hallazgos: string[] }>(
      `/api/v1/experiment/batches/${batch}`,
    ),

  decide: (body: {
    finding_id: string;
    participant_id: string;
    value: "confirmado" | "descartado" | "dudoso";
    seconds: number;
    condition: "con_asistente" | "sin_asistente";
  }) =>
    request<{ id: string }>("/api/v1/experiment/decisions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  exportUrl: (id: string) => `${BASE}/api/v1/executions/${id}/export`,
};
