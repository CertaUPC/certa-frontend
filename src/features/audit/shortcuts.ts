/* Una tecla decide y avanza.
 *
 * Se descartaron el signo de interrogación, que en teclado latinoamericano
 * exige Mayúsculas, y el paso de confirmación, que añadía una pulsación por
 * alerta.
 *
 * La pulsación involuntaria se cubre por otro lado: corregir está siempre a la
 * vista y la decisión anterior se conserva marcada como no vigente.
 */

export type Choice = "real" | "falsa" | "duda";

export interface Shortcut {
  keys: string[];
  label: string;
  description: string;
}

export const CHOICE_KEY: Record<Choice, string> = {
  real: "1",
  falsa: "2",
  duda: "3",
};

export const CHOICE_LABEL: Record<Choice, string> = {
  real: "Sí, hay que arreglarla",
  falsa: "No, es falsa alarma",
  duda: "No estoy seguro",
};

/** Lo que dice la lista de la cola una vez decidido. */
export const CHOICE_PAST: Record<Choice, string> = {
  real: "la confirmaste",
  falsa: "la descartaste",
  duda: "la dejaste en duda",
};

export const SHORTCUTS: Shortcut[] = [
  { keys: ["1"], label: "Sí, hay que arreglarla", description: "Responde y pasa a la siguiente" },
  { keys: ["2"], label: "No, es falsa alarma", description: "Responde y pasa a la siguiente" },
  { keys: ["3"], label: "No estoy seguro", description: "Responde y pasa a la siguiente" },
  { keys: ["Retroceso"], label: "Corregir la anterior", description: "Vuelve atrás y suelta esa respuesta" },
  { keys: ["←", "→"], label: "Moverse sin responder", description: "Recorre la lista sin registrar nada" },
  { keys: ["H"], label: "Mostrar u ocultar esta ayuda", description: "" },
];

export type Intent =
  | { kind: "answer"; choice: Choice }
  | { kind: "undo" }
  | { kind: "prev" }
  | { kind: "next" }
  | { kind: "help" };

/** Traduce un evento de teclado a una intención, o null si no aplica. */
export function toIntent(e: KeyboardEvent): Intent | null {
  // Nunca se secuestra el teclado mientras alguien escribe.
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
    return null;
  }
  // Las combinaciones con modificador pertenecen al navegador o al sistema.
  if (e.ctrlKey || e.metaKey || e.altKey) return null;

  switch (e.key) {
    case "1": return { kind: "answer", choice: "real" };
    case "2": return { kind: "answer", choice: "falsa" };
    case "3": return { kind: "answer", choice: "duda" };
    case "Backspace": return { kind: "undo" };
    case "ArrowLeft": return { kind: "prev" };
    case "ArrowRight": return { kind: "next" };
    case "h":
    case "H": return { kind: "help" };
    default: return null;
  }
}
