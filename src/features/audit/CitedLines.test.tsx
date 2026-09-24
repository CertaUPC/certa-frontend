/* US019. Ver el fragmento con las líneas que el modelo citó, resaltadas.
 *
 * Es el aporte del trabajo hecho pantalla: la justificación dice "la línea 47
 * mete el dato sin sanear" y el visor marca la 47 para que quien audita lo
 * compruebe sin abrir el archivo. Si el resaltado no correspondiera a lo
 * citado, o si apareciera en un hallazgo cuya cita no se pudo verificar, la
 * pantalla estaría avalando visualmente algo que el sistema no comprobó.
 *
 * El escenario infeliz es el que importa más: un hallazgo no verificable tiene
 * que mostrarse SIN resaltado y decirlo. Marcarlo igual sería presentar como
 * anclado lo que no lo está, que es justo lo que el mecanismo existe para
 * evitar. */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Session } from "./AuditScreen";
import { ThemeProvider } from "../../shared/theme";
import type { Finding } from "./data";

const CODIGO = [
  "String p = req.getParameter(\"q\");",
  "String sql = \"SELECT \" + p;",
  "st.executeQuery(sql);",
].join("\n");

/* Las tres etiquetas con que el visor rotula cada papel de una línea citada.
   Se buscan por su texto y no por su clase de estilo, que mañana cambia. */
const ROTULOS = ["aquí entra el dato", "pasa por aquí", "aquí ocurre"];

const ANCLADO: Finding = {
  id: "anclado",
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
  citedCount: 3,
  stability: { agree: 3, runs: 3 },
  priorityReason: "Es lo primero por severidad y anclaje",
  code: CODIGO,
  lang: "java",
  firstLine: 42,
  cited: [
    { line: 42, role: "entra" },
    { line: 43, role: "pasa" },
    { line: 44, role: "ocurre" },
  ],
  enclosing: "buscar",
  callers: ["atenderPeticion"],
};

/* Mismo hallazgo, salvo que sus citas no superaron la comprobación. */
const NO_VERIFICABLE: Finding = {
  ...ANCLADO,
  id: "sin-anclar",
  anchored: false,
  citedCount: 0,
  verdict: "revisar",
};

function pintar(hallazgo: Finding) {
  const vista = render(
    <ThemeProvider>
      <Session findings={[hallazgo]} fixedCondition={true} />
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
  return vista;
}

describe("US019. Líneas citadas en el visor", () => {
  it("muestra el fragmento con las líneas citadas marcadas y el sello de anclaje", () => {
    pintar(ANCLADO);

    // El fragmento está, con su numeración.
    expect(screen.getByText(/executeQuery/)).toBeInTheDocument();
    for (const numero of ["42", "43", "44"]) {
      expect(
        screen.getAllByText(numero, { exact: true }).length,
        `falta el número de línea ${numero} en la canaleta`,
      ).toBeGreaterThan(0);
    }

    // Cada línea citada lleva el rótulo de su papel: eso es el resaltado.
    for (const rotulo of ROTULOS) {
      expect(
        screen.queryByText(rotulo, { exact: false }),
        `el visor no marcó la línea rotulada "${rotulo}"`,
      ).not.toBeNull();
    }

    // El sello: el sistema declara que lo citado existe y queda comprobable.
    expect(screen.getByText(/líneas que cita existen/i)).toBeInTheDocument();
  });

  it("en un hallazgo no verificable muestra el fragmento sin resaltado y lo declara", () => {
    pintar(NO_VERIFICABLE);

    // El código sigue estando: lo que se retira es la marca, no el fragmento.
    expect(screen.getByText(/executeQuery/)).toBeInTheDocument();

    // Ni un solo rótulo. Marcar aquí sería presentar como anclado lo que no
    // se pudo comprobar.
    for (const rotulo of ROTULOS) {
      expect(
        screen.queryByText(rotulo, { exact: false }),
        `un hallazgo sin anclaje verificado no puede mostrar "${rotulo}"`,
      ).toBeNull();
    }

    // Y lo dice con todas las letras.
    expect(screen.getByText(/citó líneas que no existían/i)).toBeInTheDocument();
  });
});
