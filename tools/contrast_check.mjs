/* Contraste y tamaño del texto, medidos sobre la pantalla pintada.
 *
 * US033 pide dos cosas comprobables: que ningún cuerpo de texto baje del
 * mínimo de contraste de la norma, cuatro y medio a uno, y que ninguno baje de
 * doce píxeles. Las dos dependen de lo que el navegador pinta y no de lo que
 * dice la hoja de estilos: los tokens están en oklch, el color efectivo
 * depende del tema, y el fondo puede venir de cualquier antecesor.
 *
 * Por eso se mide en el navegador. Cada color se resuelve pintándolo en un
 * lienzo de un píxel y leyendo ese píxel, que es el color que llega al ojo.
 *
 * Cómo correrlo, con el cliente levantado con datos de muestra:
 *
 *     VITE_USE_FIXTURES=true npx vite --port 5174
 *     npm i --no-save playwright && npx playwright install chromium
 *     node tools/contrast_check.mjs
 *
 * Playwright no está en las dependencias a propósito: esto se corre a mano
 * cuando cambian los colores o los tamaños, no en cada compilación.
 */

import { chromium } from "playwright";

const FRONT = process.env.FRONT ?? "http://localhost:5174";
const MINIMO_PX = 12;

const RUTAS = [
  ["entrada", "/sign-in"],
  ["proyectos", "/projects"],
  ["ejecuciones", "/executions"],
  ["detalle", "/executions/7f3a2b10"],
  ["carga", "/executions/new"],
  ["participantes", "/participants"],
  ["revision", "/review?execution=7f3a2b10&condition=con_asistente"],
];

/* Se ejecuta dentro de la página. */
function medir(minimoPx) {
  const luminancia = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 1;
  const pincel = lienzo.getContext("2d", { willReadFrequently: true });
  const memoria = new Map();
  const rgb = (valor) => {
    if (memoria.has(valor)) return memoria.get(valor);
    pincel.clearRect(0, 0, 1, 1);
    pincel.fillStyle = "#fff";
    pincel.fillRect(0, 0, 1, 1);
    pincel.fillStyle = valor;
    pincel.fillRect(0, 0, 1, 1);
    const d = pincel.getImageData(0, 0, 1, 1).data;
    const v = [d[0], d[1], d[2]];
    memoria.set(valor, v);
    return v;
  };

  /* El primer antecesor pintado que de verdad queda detrás del texto. Sin
     comprobar que lo cubra, un elemento colocado fuera de su padre, como la
     rotulación de una marca de escala de un píxel de ancho, se mediría contra
     un fondo que no le toca. */
  const fondoDe = (el) => {
    const caja = el.getBoundingClientRect();
    let n = el;
    while (n) {
      const color = getComputedStyle(n).backgroundColor;
      const suya = n.getBoundingClientRect();
      const cubre =
        n === el ||
        (suya.left <= caja.left + 1 &&
          suya.right >= caja.right - 1 &&
          suya.top <= caja.top + 1 &&
          suya.bottom >= caja.bottom - 1);
      if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent" && cubre) {
        return rgb(color);
      }
      n = n.parentElement;
    }
    return rgb(getComputedStyle(document.body).backgroundColor || "#fff");
  };

  const filas = [];
  for (const el of document.querySelectorAll("body *")) {
    // Solo el texto propio: el de los hijos lo mide cada hijo, con su color.
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (texto.length < 3) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.95) continue;

    const tinta = rgb(cs.color);
    const fondo = fondoDe(el);
    const lt = luminancia(tinta);
    const lf = luminancia(fondo);
    const razon = (Math.max(lt, lf) + 0.05) / (Math.min(lt, lf) + 0.05);

    const px = parseFloat(cs.fontSize);
    // La norma afloja el mínimo para texto grande, que define por tamaño y peso.
    const grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    const minimo = grande ? 3 : 4.5;

    filas.push({
      razon: Number(razon.toFixed(2)),
      px,
      minimo,
      falla: razon < minimo,
      menudo: px < minimoPx,
      clase:
        typeof el.className === "string" && el.className
          ? el.className.split(" ")[0]
          : el.tagName,
      texto: texto.slice(0, 34),
    });
  }
  return filas.sort((a, b) => a.razon - b.razon);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } });

await pagina.goto(`${FRONT}/sign-in`);
await pagina.evaluate(() => {
  sessionStorage.setItem("certa.token", "muestra");
  sessionStorage.setItem("certa.role", "investigador");
});

let sano = true;

for (const tema of ["light", "dark"]) {
  console.log(`\n── tema ${tema} ──`);
  let peorDelTema = null;
  let fallan = 0;
  let menudos = 0;

  for (const [nombre, ruta] of RUTAS) {
    /* El tema se elige antes de cargar, como lo elige una persona. Cambiar el
       atributo a mano no sirve: el coloreado de sintaxis se calcula al pintar
       y se quedaría con la paleta del tema anterior. */
    await pagina.evaluate((t) => localStorage.setItem("certa.tema", t), tema);
    await pagina.goto(FRONT + ruta, { waitUntil: "networkidle" });

    // La pantalla del instrumento arranca en la instrucción, no en la tarea.
    const empezar = pagina.getByRole("button", { name: /^Empezar/ });
    if (await empezar.count()) {
      await empezar.first().click();
      await pagina.waitForTimeout(400);
    }
    await pagina.waitForTimeout(500);

    const filas = await pagina.evaluate(medir, MINIMO_PX);
    if (!filas.length) {
      console.log(`  ${nombre.padEnd(14)} sin texto`);
      continue;
    }

    const bajos = filas.filter((f) => f.falla);
    const chicos = filas.filter((f) => f.menudo);
    fallan += bajos.length;
    menudos += chicos.length;

    const peor = filas[0];
    if (!peorDelTema || peor.razon < peorDelTema.razon) {
      peorDelTema = { ...peor, nombre };
    }

    console.log(
      `  ${nombre.padEnd(14)} peor ${String(peor.razon).padStart(6)}:1` +
        ` ${String(peor.px).padStart(5)}px  .${peor.clase}  «${peor.texto}»`,
    );
    for (const f of bajos) {
      console.log(`      contraste ${f.razon}:1 bajo el mínimo de ${f.minimo} en .${f.clase} «${f.texto}»`);
    }
    for (const f of chicos) {
      console.log(`      tamaño ${f.px}px bajo el mínimo de ${MINIMO_PX} en .${f.clase} «${f.texto}»`);
    }
  }

  if (fallan || menudos) sano = false;
  console.log(
    `  ▸ peor del tema ${peorDelTema.razon}:1 en ${peorDelTema.nombre};` +
      ` ${fallan} por debajo del contraste mínimo;` +
      ` ${menudos} por debajo de ${MINIMO_PX}px`,
  );
}

await navegador.close();
console.log(sano ? "\nTodo por encima de los dos mínimos." : "\nHay texto por debajo de algún mínimo.");
process.exit(sano ? 0 : 1);
