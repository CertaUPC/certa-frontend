/* Volver a entrar con la cuenta del equipo después de una sesión de estudio.
 *
 * El navegador que dirige el estudio es el mismo que usa quien lo dirige. Al
 * entrar con un código de participante se guarda una marca que cierra las
 * pantallas del equipo, y con razón: ver la ficha de la ejecución que se está
 * resolviendo enseñaría las respuestas. El problema es que la marca vivía más
 * que la sesión que la justificaba. Terminada la sesión de estudio, la cuenta
 * del equipo se autenticaba bien y la guarda la devolvía a la entrada.
 *
 * El fallo no decía nada: el servicio respondía 200, la pantalla de entrada
 * volvía a aparecer en blanco y desde fuera se veía igual que una contraseña
 * equivocada. De ahí estas dos comprobaciones, una sobre la causa y otra sobre
 * lo que la persona hace. */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";
import { Protegida } from "../../App";
import { ThemeProvider } from "../../shared/theme";
import {
  api,
  clearSession,
  esParticipante,
  marcarParticipante,
  saveSession,
} from "../../shared/api";

beforeEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

describe("Cerrar la sesión de estudio y volver con la cuenta del equipo", () => {
  it("abrir una sesión nueva retira la marca de la anterior", () => {
    saveSession("credencial-del-participante", "desarrollador");
    marcarParticipante();
    expect(esParticipante()).toBe(true);

    saveSession("credencial-del-equipo", "investigador");
    expect(esParticipante()).toBe(false);
  });

  it("deja entrar a proyectos después de una sesión de participante", async () => {
    // Lo que quedaba en el navegador al terminar la sesión medida.
    saveSession("credencial-del-participante", "desarrollador");
    marcarParticipante();

    vi.spyOn(api, "login").mockResolvedValue({
      access_token: "credencial-del-equipo",
      role: "investigador",
    });

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <ThemeProvider>
          <Routes>
            <Route path="/sign-in" element={<LoginScreen />} />
            <Route
              path="/projects"
              element={
                <Protegida>
                  <p>Tus proyectos</p>
                </Protegida>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "yo@upc.edu.pe" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Tus proyectos")).toBeVisible());
  });
});
