/* Cómo se nombra una ejecución en toda la aplicación.
 *
 * Se llamaban por los primeros ocho caracteres de su identificador, que no le
 * dice nada a nadie: con dos corridas del mismo proyecto en la lista, ubicar la
 * que uno cargó ayer era abrirlas una por una. Si quien la carga le puso
 * nombre, manda el nombre; si no, manda la fecha, que es lo que la gente
 * recuerda. El código corto queda como dato de apoyo, no como título.
 */

import type { Execution } from "./api";

const MES_CORTO = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
});

const MES_LARGO = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const HORA = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
});

/** «Primer barrido de CWE-89», o «Corrida del 9 de setiembre de 2026». */
export function titulo(e: Execution): string {
  if (e.label) return e.label;
  const d = new Date(e.created_at);
  if (Number.isNaN(d.getTime())) return `Corrida ${corto(e)}`;
  return `Corrida del ${MES_LARGO.format(d)}`;
}

/** La versión que entra en una barra angosta o en una celda de tabla. */
export function tituloCorto(e: Execution): string {
  if (e.label) return e.label;
  const d = new Date(e.created_at);
  if (Number.isNaN(d.getTime())) return corto(e);
  return `Corrida del ${MES_CORTO.format(d)}`;
}

/** Fecha y hora, para distinguir dos corridas del mismo día. */
export function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MES_LARGO.format(d)}, ${HORA.format(d)}`;
}

export function corto(e: Execution): string {
  return e.id.slice(0, 8);
}
