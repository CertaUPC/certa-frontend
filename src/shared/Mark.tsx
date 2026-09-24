/* La marca de Certa: tres líneas de código y una señalada.
 *
 * Vive aquí y no copiada en cada pantalla porque es la misma figura que el
 * icono del navegador, y tenían que dejar de divergir.
 */

interface Props {
  size?: number;
  className?: string;
}

export function Mark({ size = 22, className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <rect x="11" y="8.5" width="13" height="2.6" rx="1.3" opacity="0.42" />
      <rect x="9.6" y="14.6" width="14.4" height="2.8" rx="1.4" />
      <rect x="11" y="20.9" width="9" height="2.6" rx="1.3" opacity="0.42" />
      <path d="M4.6 13.4 8.4 16l-3.8 2.6z" />
    </svg>
  );
}
