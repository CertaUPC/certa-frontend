/* Coloreado de sintaxis con las gramáticas de VS Code.
 *
 * No es estética: quien participa lee código a diario en su editor, y el mismo
 * coloreado reduce el efecto de novedad.
 *
 * La paleta va aquí y no en los tokens CSS porque Shiki necesita valores
 * concretos al construir el tema, no variables que se resuelvan después.
 * Leerlas de CSS hizo que los dos temas nacieran con los colores del claro.
 *
 * Las dos están desaturadas: el resaltado de anclaje va encima y no puede
 * competir con la sintaxis.
 */

import { createHighlighter, type Highlighter, type ThemeRegistration } from "shiki";

const LANGS = ["java", "python", "csharp", "php", "sql", "javascript"] as const;
export type Lang = (typeof LANGS)[number];

interface SyntaxPalette {
  plain: string;
  keyword: string;
  type: string;
  string: string;
  number: string;
  comment: string;
  fn: string;
}

/* Sobre fondo claro: luminosidad baja y croma contenido, para que ninguna
   categoría grite más que otra. */
const CLARO: SyntaxPalette = {
  plain: "#333A45",
  keyword: "#7B4B9E",
  type: "#2A6591",
  string: "#2C6B4A",
  number: "#8A5418",
  comment: "#8A94A0",
  fn: "#3D5BA9",
};

/* No se invierte: sube la luminosidad y baja el croma. Un color saturado sobre
   fondo oscuro vibra y cansa en tres cuartos de hora. */
const OSCURO: SyntaxPalette = {
  plain: "#D4DAE3",
  keyword: "#C79BE0",
  type: "#8FC0E8",
  string: "#8FD3AC",
  number: "#E0B183",
  comment: "#6C7885",
  fn: "#9DB4EE",
};

function buildTheme(
  name: string,
  type: "light" | "dark",
  p: SyntaxPalette,
): ThemeRegistration {
  return {
    name,
    type,
    // Fondo transparente: la superficie la pone el contenedor, de modo que el
    // resaltado de la línea citada se vea a través del código.
    colors: { "editor.background": "#00000000", "editor.foreground": p.plain },
    settings: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: p.comment, fontStyle: "italic" } },
      { scope: ["string", "string.quoted", "constant.other.symbol"], settings: { foreground: p.string } },
      { scope: ["constant.numeric", "constant.language", "constant.character"], settings: { foreground: p.number } },
      { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new"], settings: { foreground: p.keyword } },
      { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"], settings: { foreground: p.type } },
      { scope: ["entity.name.function", "meta.function-call", "support.function"], settings: { foreground: p.fn } },
      { scope: ["variable", "meta.definition.variable.name", "punctuation", "keyword.operator"], settings: { foreground: p.plain } },
    ],
  };
}

const TEMA_CLARO = "certa-claro";
const TEMA_OSCURO = "certa-oscuro";

let highlighter: Highlighter | null = null;
let pending: Promise<Highlighter> | null = null;

async function get(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (!pending) {
    pending = createHighlighter({
      langs: [...LANGS],
      themes: [
        buildTheme(TEMA_CLARO, "light", CLARO),
        buildTheme(TEMA_OSCURO, "dark", OSCURO),
      ],
    }).then((h) => {
      highlighter = h;
      return h;
    });
  }
  return pending;
}

/** Precarga las gramáticas para que el primer hallazgo no aparezca sin color. */
export function warmUp(): void {
  void get();
}

/** Devuelve cada línea ya coloreada, sin envoltorio de bloque. */
export async function highlightLines(
  code: string,
  lang: Lang,
  theme: "light" | "dark",
): Promise<string[]> {
  const h = await get();
  const html = h.codeToHtml(code, {
    lang,
    theme: theme === "dark" ? TEMA_OSCURO : TEMA_CLARO,
  });

  // Shiki entrega <pre><code><span class="line">…</span>…</code></pre>. Se
  // extraen las líneas para envolverlas una a una con su número y su marca de
  // anclaje, que es lo que el visor necesita controlar.
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll(".line")).map((n) => n.innerHTML);
}
