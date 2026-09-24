/* US032. La presentación tiene que ser idéntica para todos los participantes.
 *
 * No es una historia de estética. El estudio del objetivo específico cuarto
 * compara la decisión de una persona con asistente y sin él, y atribuye la
 * diferencia al asistente. Si la pantalla cambia de tema, de densidad o de
 * orden entre una condición y otra, o entre un participante y el siguiente,
 * esa variación entra en la medida sin que nadie la haya declarado y la
 * atribución deja de sostenerse.
 *
 * Lo peor es que el fallo sería mudo: los datos se recogerían igual y el
 * análisis correría igual. De ahí estas comprobaciones. */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Session } from "./AuditScreen";
import { ThemeProvider } from "../../shared/theme";
import type { Finding } from "./data";

const HALLAZGO: Finding = {
  id: "h1",
  title: "Consulta construida por concatenación",
  file: "UserDao.java",
  line: 42,
  cwe: "CWE-89",
  cweName: "Inyección SQL",
  severity: "alta",
  fingerprint: "a1b2c3d4",
  verdict: "real",
  confidence: 0.92,
  reason: "El dato llega sin sanear al punto sensible",
  anchored: true,
  attempts: 1,
  citedCount: 1,
  stability: { agree: 3, runs: 3 },
  priorityReason: "Es lo primero por severidad y anclaje",
  code: "String sql = \"SELECT \" + p;",
  lang: "java",
  firstLine: 42,
  cited: [{ line: 42, role: "ocurre" }],
  enclosing: "buscar",
  callers: ["atenderPeticion"],
};

function pintar(
  fixedCondition?: boolean | null,
  onThemeFixed?: (t: "light" | "dark") => void,
) {
  return render(
    <ThemeProvider>
      <Session
        findings={[HALLAZGO]}
        fixedCondition={fixedCondition}
        onThemeFixed={onThemeFixed}
      />
    </ThemeProvider>,
  );
}

function botonDeTema() {
  return screen.getByRole("button", { name: /claro|oscuro/i });
}

describe("US032. Presentación uniforme entre participantes", () => {
  it("dos participantes distintos arrancan con la misma presentación", () => {
    /* El primero elige tema antes de empezar. */
    const primero = pintar(true);
    const inicial = document.documentElement.dataset.theme;
    fireEvent.click(botonDeTema());
    expect(
      document.documentElement.dataset.theme,
      "antes de empezar, el tema sí se puede elegir",
    ).not.toBe(inicial);
    primero.unmount();

    /* El segundo abre el suyo: tiene que ver lo mismo que vio el primero al
       llegar, no lo que el primero eligió. Nada de lo que uno toque puede
       alterar lo que ve el siguiente. */
    pintar(true);
    expect(
      document.documentElement.dataset.theme,
      "la preferencia de un participante se filtró a la sesión del siguiente",
    ).toBe(inicial);
  });

  it("al empezar, el tema queda fijado y el control lo impide", () => {
    pintar(true);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));

    const boton = botonDeTema();
    const fijado = document.documentElement.dataset.theme;
    expect(
      boton,
      "el tema tiene que quedar fijado al iniciar la sesión",
    ).toBeDisabled();

    fireEvent.click(boton);
    expect(
      document.documentElement.dataset.theme,
      "el tema cambió a mitad de sesión",
    ).toBe(fijado);
  });

  it("explica por qué no se puede cambiar, en lugar de solo ignorar el clic", () => {
    pintar(true);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    expect(
      botonDeTema().getAttribute("title"),
      "un control que no responde y no explica se lee como avería",
    ).toMatch(/comparaci|sesión|fijad/i);
  });

  it("avisa con qué tema quedó fijada, para que el análisis pueda descartarlo", () => {
    /* Sin este dato el análisis tendría que suponer que la presentación no
       influye, que es justo lo que no se puede suponer cuando se la declara
       variable extraña controlada. */
    const avisos: string[] = [];
    pintar(true, (t) => avisos.push(t));
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));

    expect(avisos, "la sesión no avisó del tema con que quedó fijada").toHaveLength(1);
    expect(avisos[0]).toBe(document.documentElement.dataset.theme);
  });

  it("fuera del experimento no fija ni registra tema", () => {
    const avisos: string[] = [];
    pintar(null, (t) => avisos.push(t));
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    expect(
      avisos,
      "fuera del experimento no hay sesión cuyo tema registrar",
    ).toHaveLength(0);
  });

  it("fuera del experimento el tema se sigue pudiendo cambiar", () => {
    /* La fijación es del instrumento, no del producto: quien usa la
       herramienta en su trabajo elige cuando quiera. */
    pintar(null);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    const antes = document.documentElement.dataset.theme;
    fireEvent.click(botonDeTema());
    expect(document.documentElement.dataset.theme).not.toBe(antes);
  });
});
