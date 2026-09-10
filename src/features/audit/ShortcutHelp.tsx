/* <dialog> nativo y no un div: trae su propia capa, atrapa el foco, responde a
 * Escape y ningún contenedor con overflow lo recorta. */

import { useEffect, useRef } from "react";
import { SHORTCUTS } from "./shortcuts";
import s from "./ShortcutHelp.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelp({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className={s.dialog} onClose={onClose}>
      <h2 className={s.title}>Atajos de teclado</h2>
      <p className={s.note}>
        Elegir y confirmar son dos pasos para que un golpe involuntario no
        registre una respuesta.
      </p>

      <dl className={s.list}>
        {SHORTCUTS.map((sc) => (
          <div className={s.rowItem} key={sc.label}>
            <dt className={s.keys}>
              {sc.keys.map((k) => (
                <kbd className={s.kbd} key={k}>{k}</kbd>
              ))}
            </dt>
            <dd className={s.desc}>
              <b>{sc.label}</b>
              {sc.description && <span>{sc.description}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <button className={s.close} onClick={onClose}>Cerrar</button>
    </dialog>
  );
}
