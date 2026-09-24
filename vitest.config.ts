/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Las pruebas del cliente corren sobre un navegador simulado. No se levanta el
// servicio: lo que se comprueba es lo que la pantalla muestra y lo que oculta,
// que es donde vive el riesgo del experimento.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    css: true,
  },
});
