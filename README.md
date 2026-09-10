# certa-frontend

Interfaz de Certa. Dos aplicaciones dentro de la misma: la que usa quien
investiga para preparar y seguir las ejecuciones, y la que ve quien participa en
el experimento, que es una sola pantalla y nada más.

## Arrancar

```
npm install
npm run dev
```

En <http://localhost:5173>. El servicio tiene que estar levantado en la
dirección de `VITE_API_URL`.

```
VITE_API_URL=http://localhost:8000
VITE_USE_FIXTURES=false
```

Con `VITE_USE_FIXTURES=true` la aplicación se recorre completa sin servicio,
usando los datos de `src/shared/fixtures.ts`. Sirve para revisar el flujo y como
respaldo si algo fallara durante la sustentación. La interfaz los marca como
muestra: nunca se presentan como resultados.

## Los dos flujos

| Ruta | Quién | Qué ve |
|---|---|---|
| `/sign-in` | Investigador, líder técnico | Acceso |
| `/executions` | Investigador, líder técnico | Ejecuciones y su avance |
| `/executions/new` | Investigador | Carga de un SARIF |
| `/executions/:id` | Investigador, líder técnico | Detalle, métricas, exportación |
| `/participants` | Investigador | Participantes y su orden asignado |
| `/session` | Participante | La tarea, y nada más |

`/session` no lleva armazón ni navegación. La ejecución, el participante y la
condición llegan en la dirección:

```
/session?execution=<uuid>&participant=<uuid>&condition=con_asistente
```

Ese enlace lo arma quien investiga. Así quien participa no elige nada de lo que
se está midiendo, y la condición queda fijada: el conmutador de condición
desaparece de la pantalla cuando viene declarada.

## La pantalla de auditoría

Una tecla decide y avanza:

| Tecla | Qué hace |
|---|---|
| `1` | Sí, hay que arreglarla |
| `2` | No, es falsa alarma |
| `3` | No estoy seguro |
| `Retroceso` | Corrige la anterior |
| `←` `→` | Recorre sin registrar |
| `H` | Muestra u oculta la ayuda |

Se descartaron dos alternativas: el signo de interrogación, que en teclado
latinoamericano exige Mayúsculas, y un paso de confirmación, que añadía una
pulsación por alerta. El riesgo de la pulsación involuntaria se cubre por otro
lado: corregir está siempre a la vista, y el servicio conserva la decisión
anterior marcada como no vigente en lugar de sobrescribirla.

La lectura del código es la parte que más se cuidó, porque es donde transcurre
la tarea. `CodeViewer` se parece a un editor porque quien lee es desarrollador:
canaleta con números, monoespaciada, coloreada por sintaxis con las gramáticas
de VS Code a través de Shiki. No lo es: sin cursor, sin entrada de texto y sin
nada que insinúe que se puede editar.

Sobre ese coloreado va el resaltado de anclaje, que marca las líneas que el
modelo citó y distingue por dónde entra el dato, por dónde pasa y dónde ocurre
el problema. Las dos paletas de sintaxis están desaturadas para que no compitan
con esa marca.

### Las dos condiciones

La condición de control corre sobre la misma pantalla. Solo se ocultan el
veredicto, la confianza, la justificación y el sello de anclaje; también
desaparecen los filtros por veredicto y anclaje, porque ofrecerlos revelaría lo
que la condición oculta. La densidad, el orden y todo lo demás son idénticos, de
modo que la diferencia que se mide sea el asistente y no el aspecto de la
pantalla.

## Tema

Arranca en oscuro. Durante una sesión con participantes queda fijado: cambiarlo
a mitad de camino rompería que la presentación sea idéntica entre las dos
condiciones.

Los colores viven en `src/styles/tokens.css` como variables OKLCH, con el
conjunto claro en `:root` y el oscuro en `:root[data-theme="dark"]`. Ningún
componente escribe un color literal.

La única excepción es la paleta de sintaxis, que está en TypeScript dentro de
`highlight.ts`: Shiki necesita valores concretos al construir cada tema, no
variables que se resuelvan después. Leerlas del CSS hizo que los dos temas
nacieran con los colores del claro.

## Sin personalización

No hay preferencias de usuario más allá del tema. Es una decisión del diseño
experimental: si cada participante pudiera acomodar la interfaz a su gusto, esa
variación entraría en los resultados como variable extraña.

## Organización

```
src/
  features/
    access/        acceso
    audit/         la tarea: cola, código, decisión, cierre
    executions/    ejecuciones, carga, detalle
    participants/  participantes y su asignación
  shared/          cliente de la API, tema, estados, armazón
  styles/          tokens y base
```

Cada componente lleva su propio módulo CSS. No hay hoja global salvo `base.css`,
que fija tipografías y el comportamiento por omisión.

`shared/api.ts` es el único que sabe de red. `features/audit/adapter.ts` traduce
lo que devuelve el servicio a lo que la pantalla necesita: el servicio habla de
reglas, huellas y líneas citadas; la pantalla, en las palabras de quien revisa.
Lo que el servicio no da queda vacío y la pantalla lo omite en lugar de
rellenarlo con un valor plausible.

## Estados

`shared/States.tsx` reúne cargando, error y vacío en un solo sitio, para que se
vean iguales en toda la aplicación. Un error dice qué pasó y qué hacer; no se
disculpa ni es vago.

## Tipografías

Cascadia Code para el código y Public Sans para el texto, ambas servidas desde
el paquete y no desde un servicio externo. Las dos son de licencia permisiva.

## Verificar

```
npx tsc --noEmit
npm run build
```

Las dos corren también en la integración continua, en
`certa/.github/workflows/ci.yml`.
