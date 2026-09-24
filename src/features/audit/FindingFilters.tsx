/* Filtros de la cola.
 *
 * Filtrar es del usuario, no del sistema: la lista completa sigue ahí y el
 * contador dice cuántas se ocultan.
 *
 * En la condición de control desaparecen los filtros por veredicto y anclaje:
 * ofrecerlos revelaría lo que esa condición oculta.
 */

import type { Verdict } from "./data";
import s from "./FindingFilters.module.css";

export interface Filters {
  cwe: string | null;
  verdict: Verdict | null;
  anchored: boolean | null;
  pending: boolean;
}

export const NO_FILTERS: Filters = {
  cwe: null,
  verdict: null,
  anchored: null,
  pending: false,
};

export function isFiltering(f: Filters): boolean {
  return f.cwe !== null || f.verdict !== null || f.anchored !== null || f.pending;
}

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: "real", label: "Parecen reales" },
  { value: "descartado", label: "Descartadas" },
  { value: "revisar", label: "Sin justificar" },
];

interface Props {
  filters: Filters;
  cwes: string[];
  assisted: boolean;
  shown: number;
  total: number;
  onChange: (f: Filters) => void;
}

export function FindingFilters({
  filters, cwes, assisted, shown, total, onChange,
}: Props) {
  const filtering = isFiltering(filters);

  return (
    <div className={s.wrap}>
      <div className={s.chips}>
        <button
          className={s.chip}
          aria-pressed={filters.pending}
          onClick={() => onChange({ ...filters, pending: !filters.pending })}
        >
          Sin responder
        </button>

        {assisted &&
          VERDICTS.map((v) => (
            <button
              key={v.value}
              className={`${s.chip} ${s[v.value]}`}
              aria-pressed={filters.verdict === v.value}
              onClick={() =>
                onChange({
                  ...filters,
                  verdict: filters.verdict === v.value ? null : v.value,
                })
              }
            >
              {v.label}
            </button>
          ))}

        {assisted && (
          <button
            className={s.chip}
            aria-pressed={filters.anchored === false}
            onClick={() =>
              onChange({
                ...filters,
                anchored: filters.anchored === false ? null : false,
              })
            }
          >
            Sin comprobar
          </button>
        )}

      </div>

      {/* Doce debilidades son doce pastillas, y desplegadas ocupaban mas alto
          que la propia lista de alertas. Plegadas dicen cuantas hay; se abren
          cuando alguien quiere filtrar por una. El elegido se lee en el
          resumen del pliegue, de modo que no hay que abrirlo para saberlo. */}
      {cwes.length > 0 && (
        <details className={s.pliegue} open={filters.cwe !== null}>
          <summary className={s.resumen}>
            Debilidad
            <span className={s.cuenta}>
              {filters.cwe ?? `${cwes.length} tipos`}
            </span>
          </summary>
          <div className={s.chips}>
            {cwes.map((c) => (
              <button
                key={c}
                className={`${s.chip} mono`}
                aria-pressed={filters.cwe === c}
                onClick={() =>
                  onChange({ ...filters, cwe: filters.cwe === c ? null : c })
                }
              >
                {c}
              </button>
            ))}
          </div>
        </details>
      )}

      {filtering && (
        <p className={s.status}>
          {shown === 0 ? (
            <>
              Ninguna alerta cumple el filtro.{" "}
              <button className={s.clear} onClick={() => onChange(NO_FILTERS)}>
                Quitar filtros
              </button>
            </>
          ) : (
            <>
              Mostrando {shown} de {total}.{" "}
              <button className={s.clear} onClick={() => onChange(NO_FILTERS)}>
                Ver todas
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
