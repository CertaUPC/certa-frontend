/* Superficie de lectura de código.
 *
 * Se parece a un editor porque quien lee es desarrollador: canaleta con
 * números, monoespaciada, coloreada. No lo es: sin cursor, sin entrada de texto
 * y sin nada que insinúe que se puede editar.
 */

import { useEffect, useState } from "react";
import { highlightLines, type Lang } from "./highlight";
import styles from "./CodeViewer.module.css";

export type { Lang };

export type LineRole = "entra" | "pasa" | "ocurre";

export interface CitedLine {
  line: number;
  role: LineRole;
}

interface Props {
  code: string;
  lang: Lang;
  firstLine: number;
  cited: CitedLine[];
  /** En la condición de control las marcas se atenúan y pierden su etiqueta. */
  showRoles: boolean;
  theme: "light" | "dark";
}

const ROLE_LABEL: Record<LineRole, string> = {
  entra: "aquí entra el dato",
  pasa: "pasa por aquí",
  ocurre: "aquí ocurre",
};

export function CodeViewer({ code, lang, firstLine, cited, showRoles, theme }: Props) {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    let vivo = true;
    highlightLines(code, lang, theme)
      .then((l) => {
        if (vivo) setLines(l);
      })
      .catch(() => {
        /* Sin color el visor sigue sirviendo: se queda con las líneas en
           crudo, que es con lo que arranca. */
      });
    return () => {
      vivo = false;
    };
  }, [code, lang, theme]);

  const roles = new Map(cited.map((c) => [c.line, c.role]));
  const crudas = code.split("\n");

  return (
    <div className={styles.surface}>
      <div className={styles.scroll}>
        <pre className={styles.pre}>
          <code>
            {crudas.map((cruda, i) => {
              const numero = firstLine + i;
              const role = roles.get(numero);
              const marcada = role !== undefined;
              return (
                <span
                  key={numero}
                  className={[
                    styles.line,
                    marcada ? styles.marked : "",
                    marcada && showRoles ? styles[role!] : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.gutter} aria-hidden="true">
                    {numero}
                  </span>
                  <span
                    className={styles.text}
                    dangerouslySetInnerHTML={
                      lines ? { __html: lines[i] ?? "" } : undefined
                    }
                  >
                    {lines ? undefined : cruda}
                  </span>
                  {marcada && showRoles ? (
                    <span className={styles.role}>{ROLE_LABEL[role!]}</span>
                  ) : null}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
