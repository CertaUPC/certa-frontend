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
  degradado: false,
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
      screen.queryByRole("button", { name: /ocultar el juicio del asistente|volver a verlo/i }),
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
      screen.queryByRole("button", { name: /ocultar el juicio del asistente|volver a verlo/i }),
    ).toBeNull();
  });
});

describe("Alerta que la cadena no ha analizado", () => {
  /* Dos tercios de la ejecución del corpus no tienen veredicto todavía, y el
     adaptador les ponía «revisar», cuyo rótulo decía «Nadie pudo
     justificarlo». La pantalla afirmaba que el modelo lo intentó y falló
     cuando nadie le había preguntado nada. */
  const SIN_ANALIZAR: Finding = {
    ...HALLAZGO,
    verdict: "sin_analizar",
    confidence: null,
    reason: "",
    anchored: false,
    attempts: 0,
    citedCount: 0,
    stability: null,
  };

  function pintarSinAnalizar() {
    return render(
      <ThemeProvider>
        <Session findings={[SIN_ANALIZAR]} fixedCondition />
      </ThemeProvider>,
    );
  }

  it("dice que no se ha analizado, y no que nadie pudo justificarlo", () => {
    pintarSinAnalizar();
    empezar();
    expect(screen.getByText(/Todavía sin analizar/)).toBeInTheDocument();
    expect(screen.queryByText(/pudo justificarlo/)).toBeNull();
  });

  it("no afirma que citó líneas inexistentes", () => {
    pintarSinAnalizar();
    empezar();
    expect(
      screen.queryByText(/líneas que no existían/),
      "acusa al modelo de algo que no hizo: no se le preguntó",
    ).toBeNull();
  });
});

describe("Fuera del experimento", () => {
  it("permite alternar cuando no hay condición fijada", () => {
    /* El rótulo decía «Ver condición de control» y lo que hacía era cambiar
       la sesión entera, no enseñar una vista previa. Ahora dice lo que hace. */
    pintar();
    empezar();
    expect(
      screen.getByRole("button", { name: /ocultar el juicio del asistente/i }),
    ).toBeInTheDocument();
  });
});

describe("Alerta sin fragmento guardado", () => {
  /* El servicio responde 404 al contexto en dos casos corrientes: la alerta
     que la cadena no ha tocado y la ejecución a la que le borraron los
     fragmentos. La pantalla pintaba entonces un visor vacío de media pantalla
     y el panel seguía diciendo que las líneas citadas estaban marcadas ahí. */
  const SIN_CODIGO: Finding = {
    ...HALLAZGO,
    code: "",
    enclosing: "",
    callers: [],
  };

  function pintarSinCodigo() {
    return render(
      <ThemeProvider>
        <Session findings={[SIN_CODIGO]} fixedCondition />
      </ThemeProvider>,
    );
  }

  it("dice que no hay código en vez de dejar el hueco", () => {
    pintarSinCodigo();
    empezar();
    expect(screen.getByText(/no hay código que enseñar/i)).toBeInTheDocument();
  });

  it("no afirma que las líneas citadas están marcadas arriba", () => {
    pintarSinCodigo();
    empezar();
    expect(
      screen.queryByText(/Están marcadas para que las compruebes/),
      "promete marcas sobre un código que no está en pantalla",
    ).toBeNull();
  });

  it("no nombra una función que no se pudo aislar", () => {
    pintarSinCodigo();
    empezar();
    expect(
      screen.queryByText(/Esto es todo el código disponible/),
      "decía «la función .», con el hueco y el punto",
    ).toBeNull();
  });
});

describe("Las líneas citadas no se escapan de su condición", () => {
  /* El resaltado es la cita hecha visible. Ocultar el rótulo y dejar la línea
     marcada enseña dónde miró el asistente, que es la ayuda que la condición
     de control retira; y sobre un veredicto sin anclaje comprobado, presenta
     como respaldado lo que no se pudo respaldar. */
  function lineasMarcadas(): number {
    return document.querySelectorAll("[class*='marked']").length;
  }

  it("las marca en la condición asistida cuando el anclaje se comprobó", () => {
    render(
      <ThemeProvider>
        <Session
          findings={[{ ...HALLAZGO, code: "a\nb\nc", firstLine: 1,
            cited: [{ line: 1, role: "entra" }, { line: 3, role: "ocurre" }] }]}
          fixedCondition
        />
      </ThemeProvider>,
    );
    empezar();
    expect(lineasMarcadas()).toBe(2);
  });

  it("no marca ninguna en la condición de control", () => {
    render(
      <ThemeProvider>
        <Session
          findings={[{ ...HALLAZGO, code: "a\nb\nc", firstLine: 1,
            cited: [{ line: 1, role: "entra" }, { line: 3, role: "ocurre" }] }]}
          fixedCondition={false}
        />
      </ThemeProvider>,
    );
    empezar();
    expect(lineasMarcadas(), "el resaltado delata la cita del asistente").toBe(0);
  });

  it("no marca ninguna cuando el anclaje no se comprobó", () => {
    render(
      <ThemeProvider>
        <Session
          findings={[{ ...HALLAZGO, anchored: false, code: "a\nb\nc", firstLine: 1,
            cited: [{ line: 1, role: "entra" }, { line: 3, role: "ocurre" }] }]}
          fixedCondition
        />
      </ThemeProvider>,
    );
    empezar();
    expect(lineasMarcadas()).toBe(0);
  });
});

describe("La lista sobrevive a que los hallazgos se actualicen", () => {
  /* Los contextos llegan por tandas después de pintar, y cada tanda produce un
     arreglo nuevo con objetos nuevos. La lista se quedaba con los objetos
     viejos: al pulsar uno, buscarlo en el arreglo vigente devolvía -1, el
     índice se iba fuera de rango y la pantalla entera se caía en negro con un
     «Cannot read properties of undefined». */
  const UNO: Finding = { ...HALLAZGO, id: "h1", title: "La primera alerta" };
  const DOS: Finding = { ...HALLAZGO, id: "h2", title: "La segunda alerta" };

  it("deja abrir una alerta después de que su objeto se haya reemplazado", () => {
    const { rerender } = render(
      <ThemeProvider>
        <Session findings={[UNO, DOS]} fixedCondition />
      </ThemeProvider>,
    );
    empezar();

    /* La misma lista, con objetos nuevos: es lo que hace setFindings cuando
       entra una tanda de contextos. */
    rerender(
      <ThemeProvider>
        <Session
          findings={[{ ...UNO, code: "public void a() {}" },
                     { ...DOS, code: "public void b() {}" }]}
          fixedCondition
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /La segunda alerta/ }));
    expect(
      screen.getByRole("heading", { name: HALLAZGO.cweName }),
      "la pantalla se cayó al abrir la alerta",
    ).toBeInTheDocument();
    expect(screen.getByText(/Alerta/)).toBeInTheDocument();
  });
});


/* El cierre del ultimo bloque. La sesion ya quedo sellada en el servidor al
   llegar al resumen, de modo que devolver a las alertas no era solo confuso:
   una decision mas entraba despues del cierre, y eso dejo dos sesiones
   completas marcadas como incompletas. */
/* El contador de la alerta en curso. Se fija porque es un cambio del
   instrumento: el tiempo por hallazgo es la variable secundaria de OE4-I2, y
   tenerlo a la vista influye en lo que se mide. Que este o no debe ser una
   decision explicita y no un accidente de un refactor. */
describe("Contador de la alerta en curso", () => {
  it("arranca en cero y no se anuncia en voz alta", () => {
    pintar(true);
    empezar();
    const reloj = screen.getByText("0s");
    expect(reloj).toBeTruthy();
    expect(reloj.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Cierre de la sesion entera", () => {
  function terminar(
    props: { onExit?: () => void; participantCode?: string } = {},
  ) {
    render(
      <ThemeProvider>
        <Session findings={[HALLAZGO]} fixedCondition {...props} />
      </ThemeProvider>,
    );
    empezar();
    /* El boton lleva la tecla del atajo dentro, de modo que su nombre
       accesible no es solo la etiqueta. */
    fireEvent.click(screen.getByRole("button", { name: /No, es falsa alarma/ }));
  }

  it("ofrece salir y no volver a las alertas", () => {
    terminar({ onExit: () => {} });
    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver a las alertas" })).toBeNull();
  });

  it("al salir avisa a quien sabe adonde ir", () => {
    const visitas: number[] = [];
    terminar({ onExit: () => visitas.push(1) });
    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(visitas).toHaveLength(1);
  });

  it("pide el cuestionario antes de dejar salir", () => {
    /* Es el unico dato del estudio que no se puede recoger despues: nadie
       puntua la usabilidad de una sesion que hizo hace tres dias. */
    terminar({ onExit: () => {} });
    const enlace = screen.getByRole("link", { name: /cuestionario/i });
    expect(enlace.getAttribute("href")).toContain("forms.gle");
    expect(enlace.getAttribute("target")).toBe("_blank");
  });

  it("enseña el codigo que el cuestionario va a pedir", () => {
    /* El guion que puntua une por esa columna: un codigo escrito de memoria y
       mal deja el cuestionario huerfano. */
    terminar({ onExit: () => {}, participantCode: "P-07" });
    expect(screen.getByText("P-07")).toBeTruthy();
  });

  it("no pide cuestionario cuando no se cierra la sesion", () => {
    terminar();
    expect(screen.queryByRole("link", { name: /cuestionario/i })).toBeNull();
  });

  it("sin salida declarada sigue dejando corregir", () => {
    /* La revision libre no cierra ninguna sesion: ahi volver es correcto. */
    terminar();
    expect(screen.getByRole("button", { name: "Volver a las alertas" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salir" })).toBeNull();
  });
});
