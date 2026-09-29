/* La explicación se abre con el cursor, con el teclado y con un toque.
 *
 * Hasta ahora eso lo hacía la hoja de estilos con `:hover` y `:focus-within`.
 * Al sacar el globo de su contenedor, para que ninguna caja que recorte lo que
 * sobra se lo coma, la apertura pasó a ser estado del componente. Estas
 * comprobaciones cubren ese cambio: si se rompe, el término se queda sin
 * explicación y la pantalla vuelve a ser legible solo para quien ya sabe.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hint } from "./Hint";

function pintar() {
  const { container } = render(
    <Hint termino="F1">La media armónica entre precisión y exhaustividad.</Hint>,
  );
  return {
    caja: container.firstElementChild as HTMLElement,
    boton: screen.getByRole("button", { name: "Qué significa F1" }),
    /* Con `hidden`, porque mientras está cerrada la explicación es invisible
       y las consultas accesibles la saltan. Ahí está el matiz que interesa:
       sigue en el árbol, y por eso `aria-describedby` la alcanza. */
    globo: screen.getByRole("tooltip", { hidden: true }),
  };
}

describe("La explicación al alcance del cursor", () => {
  it("está en el árbol aunque no se vea, y el botón la señala", () => {
    const { boton, globo } = pintar();
    expect(boton).toHaveAttribute("aria-describedby", globo.id);
    expect(globo).not.toHaveAttribute("data-visible");
    expect(globo).toHaveTextContent("media armónica");
  });

  it("se abre al pasar el cursor y se cierra al retirarlo", () => {
    const { caja, globo } = pintar();
    fireEvent.pointerEnter(caja);
    expect(globo).toHaveAttribute("data-visible");
    fireEvent.pointerLeave(caja);
    expect(globo).not.toHaveAttribute("data-visible");
  });

  it("se abre con el teclado, que llega al mismo sitio que el ratón", () => {
    const { boton, globo } = pintar();
    fireEvent.focus(boton);
    expect(globo).toHaveAttribute("data-visible");
    fireEvent.blur(boton);
    expect(globo).not.toHaveAttribute("data-visible");
  });

  it("con un toque se fija, y sigue abierta cuando el cursor se va", () => {
    const { caja, boton, globo } = pintar();
    fireEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerLeave(caja);
    expect(globo).toHaveAttribute("data-visible");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(globo).not.toHaveAttribute("data-visible");
    expect(boton).toHaveAttribute("aria-expanded", "false");
  });
});
