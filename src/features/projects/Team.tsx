/* Quién está en el proyecto, y quién manda.
 *
 * Se invita por correo. El servicio lo resuelve a una cuenta, y si no existe
 * lo dice en vez de callar: «no hay ninguna cuenta con ese correo» le ahorra
 * a quien invita media hora preguntándose por qué el otro no ve nada.
 */

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type Member } from "../../shared/api";
import s from "./Team.module.css";

interface Props {
  projectId: string;
  /** El correo de quien mira, para no ofrecerle retirarse a sí mismo. */
  yo: string | null;
}

export function Team({ projectId, yo }: Props) {
  const [miembros, setMiembros] = useState<Member[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function cargar() {
    try {
      setMiembros(await api.members(projectId));
      setFallo(null);
    } catch (err) {
      setFallo(
        err instanceof ApiError ? err.message : "No se pudo leer el equipo.",
      );
    }
  }

  useEffect(() => {
    let vigente = true;
    api
      .members(projectId)
      .then((m) => vigente && setMiembros(m))
      .catch((err) => {
        if (vigente) {
          setFallo(
            err instanceof ApiError
              ? err.message
              : "No se pudo leer el equipo.",
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, [projectId]);

  /* Solo el administrador invita y retira. Se mira el papel de quien está
     viendo, no su rol de cuenta: el permiso viene de la relación con este
     proyecto y no de un rango global. */
  const mio = miembros?.find((m) => m.email === yo);
  const administro = mio?.role === "administrador";

  async function invitar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTrabajando(true);
    try {
      await api.inviteMember(projectId, correo.trim());
      setCorreo("");
      await cargar();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo invitar.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function retirar(m: Member) {
    setError(null);
    try {
      await api.removeMember(projectId, m.user_id);
      await cargar();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo retirar.",
      );
    }
  }

  if (fallo) return <p className={s.fallo}>{fallo}</p>;
  if (!miembros) return <p className={s.cargando}>Leyendo el equipo…</p>;

  return (
    <div className={s.equipo}>
      <ul className={s.lista}>
        {miembros.map((m) => (
          <li key={m.user_id} className={s.fila}>
            <span className={s.inicial} aria-hidden="true">
              {m.email ? m.email[0] : "?"}
            </span>
            <span className={s.correo}>
              {m.email || m.user_id}
              {m.email === yo && <span className={s.tuyo}>tú</span>}
            </span>
            <span className={m.role === "administrador" ? s.manda : s.papel}>
              {m.role}
            </span>
            {administro && m.email !== yo && (
              <button
                type="button"
                className={s.quitar}
                onClick={() => retirar(m)}
              >
                Retirar
                <span className="solo-lectores"> a {m.email || m.user_id}</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {administro ? (
        <form className={s.invitar} onSubmit={invitar}>
          <label className={s.rotulo} htmlFor={`correo-${projectId}`}>
            Invitar a alguien por su correo
          </label>
          <input
            id={`correo-${projectId}`}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="companero@upc.edu.pe"
            required
          />
          <button type="submit" disabled={trabajando} aria-busy={trabajando}>
            {trabajando ? "Invitando…" : "Invitar"}
          </button>
        </form>
      ) : (
        <p className={s.nota}>Solo su administrador invita o retira.</p>
      )}

      <div role="alert" aria-live="assertive">
        {error && <p className={s.fallo}>{error}</p>}
      </div>
    </div>
  );
}
