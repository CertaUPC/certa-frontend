/* Quién decidió qué sobre este hallazgo, y cuándo.
 *
 * Solo en la revisión libre. Durante una sesión medida, enseñarle a alguien lo
 * que otros decidieron sobre la misma alerta contamina justo lo que se está
 * midiendo, y ni siquiera haría falta que lo leyera con atención.
 *
 * El registro guarda las rectificaciones: una decisión corregida no se
 * sobrescribe, se marca como no vigente y queda debajo. Eso es lo que permite
 * responder «esto se dio por falsa alarma en marzo y se rectificó en abril».
 */

import { useEffect, useState } from "react";
import { api, type ApiAudit } from "../../shared/api";
import s from "./FindingHistory.module.css";

const DICE: Record<string, string> = {
  confirmado: "la dio por real",
  descartado: "la dio por falsa alarma",
  dudoso: "no se decidió",
};

export function FindingHistory({ findingId }: { findingId: string }) {
  const [registros, setRegistros] = useState<ApiAudit[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    setRegistros(null);
    api
      .audits(findingId)
      .then((r) => vigente && setRegistros(r))
      .catch(() => {
        /* El historial es contexto, no la tarea. Si el servicio no responde,
           la auditoría sigue funcionando y aquí no se pinta nada. */
        if (vigente) setRegistros([]);
      });
    return () => {
      vigente = false;
    };
  }, [findingId]);

  if (!registros || registros.length === 0) return null;

  const vigentes = registros.filter((r) => r.is_current).length;

  return (
    <div className={s.bloque}>
      <button
        type="button"
        className={s.cabecera}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
      >
        <span className={s.rotulo}>Ya se decidió antes</span>
        <span className={s.cuenta}>
          {registros.length === 1 ? "1 registro" : `${registros.length} registros`}
          {vigentes !== registros.length && ", con rectificaciones"}
        </span>
        <Flecha abierto={abierto} />
      </button>

      {abierto && (
        <ol className={s.lista}>
          {registros.map((r) => (
            <li key={r.id} className={r.is_current ? s.vigente : s.corregida}>
              <span className={s.que}>{DICE[r.value] ?? r.value}</span>
              <span className={s.cuando}>
                {cuando(r.created_at)}
                {r.seconds !== null && ` · ${r.seconds.toFixed(0)} s`}
                {!r.is_current && " · rectificada después"}
              </span>
              {r.comment && <span className={s.nota}>{r.comment}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function cuando(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Flecha({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={s.flecha}
      data-abierto={abierto || undefined}
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4.5 6.5 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
