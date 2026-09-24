/* La condición sin asistente es el instrumento del experimento del objetivo
   específico cuarto, no una variante cosmética de la pantalla.

   El estudio compara la decisión de una persona con y sin la ayuda de la
   herramienta. Si la pantalla de control dejara ver el veredicto, la confianza,
   la explicación o la comprobación de anclaje, las dos condiciones dejarían de
   ser dos y la comparación no mediría nada. El fallo además sería silencioso:
   los datos se recogerían igual, el análisis correría igual y el resultado
   parecería válido.

   De ahí que estas comprobaciones existan, y que sean las primeras del cliente. */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Session } from "./AuditScreen";
import { ThemeProvider } from "../../shared/theme";
import type { Finding } from "./data";

/* Cada texto de este hallazgo es reconocible, para que la comprobación pueda
   buscarlo por su contenido y no por una clase de estilo que mañana cambie. */
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
  reason: "EL DATO LLEGA SIN SANEAR AL PUNTO SENSIBLE",
  anchored: true,
  attempts: 1,
  citedCount: 3,
  stability: { agree: 3, runs: 3 },
  priorityReason: "ES LO PRIMERO POR SEVERIDAD Y ANCLAJE",
  code: "String sql = \"SELECT \" + p;",
  lang: "java",
  firstLine: 42,
  cited: [],
  enclosing: "buscar",
  callers: ["atenderPeticion"],
};

/* Lo que la condición de control tiene que ocultar, en las palabras con que la
   pantalla lo muestra. */
const DEL_ASISTENTE = [
  HALLAZGO.reason,
  HALLAZGO.priorityReason,
  "Parece real",      // VERDICT_LABEL
  "muy seguro",       // confidenceWord(0.92)
];

/* La pantalla lee el tema del contexto, de modo que la prueba lo provee igual
   que lo hace la aplicación. Sin condición fijada, la sesión permite alternar:
   es el caso de uso fuera del experimento. */
function pintar(asistida?: boolean) {
  return render(
    <ThemeProvider>
      <Session findings={[HALLAZGO]} fixedCondition={asistida} />
    </ThemeProvider>,
  );
}

/* La pantalla abre en la instrucción previa; el cuerpo aparece al empezar. */
function empezar() {
  fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
}

describe("Condición sin asistente", () => {
  it("no deja ver nada del juicio del asistente", () => {
    pintar(false);
    empezar();
    for (const texto of DEL_ASISTENTE) {
      expect(
        screen.queryByText(texto, { exact: false }),
        `la condición de control está mostrando: ${texto}`,
      ).toBeNull();
    }
  });

  it("sí muestra el hallazgo y su código, que son comunes a las dos condiciones", () => {
    pintar(false);
    empezar();
    // El encabezado es la debilidad, y el mensaje de la regla va debajo en
    // cuerpo de texto. Las dos cosas tienen que estar: la condición de
    // control oculta el juicio del asistente, no la alerta.
    expect(
      screen.getByRole("heading", { name: HALLAZGO.cweName }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(HALLAZGO.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/UserDao\.java/).length).toBeGreaterThan(0);
    expect(screen.getByText(/buscar/)).toBeInTheDocument();
  });

  it("declara al participante que está en la condición de control", () => {
    pintar(false);
    empezar();
    expect(screen.getByText(/solo se ocultan/i)).toBeInTheDocument();
  });

  it("no ofrece alternar de condición cuando el investigador la fijó", () => {
    pintar(false);
    empezar();
    expect(
      screen.queryByRole("button", { name: /condición de control|volver a la asistida/i }),
      "el participante no puede elegir la condición que se está midiendo",
    ).toBeNull();
  });
});

describe("Condición asistida", () => {
  it("muestra el juicio completo", () => {
    pintar(true);
    empezar();
    for (const texto of DEL_ASISTENTE) {
      expect(
        screen.queryByText(texto, { exact: false }),
        `la condición asistida debería mostrar: ${texto}`,
      ).not.toBeNull();
    }
  });

  it("tampoco ofrece alternar cuando la condición viene fijada", () => {
    pintar(true);
    empezar();
    expect(
      screen.queryByRole("button", { name: /condición de control|volver a la asistida/i }),
    ).toBeNull();
  });
});

describe("Fuera del experimento", () => {
  it("permite alternar cuando no hay condición fijada", () => {
    pintar();
    empezar();
    expect(
      screen.getByRole("button", { name: /condición de control/i }),
    ).toBeInTheDocument();
  });
});
