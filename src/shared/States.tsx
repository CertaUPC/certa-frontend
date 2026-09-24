/* Un solo componente por estado, para que se vean iguales en toda la
 * aplicación. Un error dice qué pasó y qué hacer; no se disculpa. */

import type { ReactNode } from "react";
import s from "./States.module.css";

export function Loading({ what }: { what: string }) {
  return (
    <div className={s.state} role="status" aria-live="polite">
      <span className={s.pulse} aria-hidden="true" />
      <p className={s.text}>Cargando {what}</p>
    </div>
  );
}

export function Failed({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={s.state} role="alert">
      <p className={s.errorTitle}>No se pudo cargar</p>
      <p className={s.text}>{message}</p>
      {onRetry && (
        <button className={s.retry} onClick={onRetry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <h2 className={s.emptyTitle}>{title}</h2>
      {children}
    </div>
  );
}

/** Centra el estado en la ventana. Para las pantallas que no viven dentro del
 *  armazón y por tanto no tienen ni cabecera ni margen propio. */
export function Pantalla({ children }: { children: ReactNode }) {
  return <div className={s.pantalla}>{children}</div>;
}

/** Filas grises con la forma del contenido que viene, en vez de una pantalla vacía. */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={s.skeleton} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={s.bar} style={{ inlineSize: `${92 - i * 7}%` }} />
      ))}
    </div>
  );
}
