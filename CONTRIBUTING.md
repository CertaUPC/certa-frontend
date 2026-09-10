# Cómo se trabaja en este repositorio

## Ramas

Se sigue git flow. Dos ramas viven siempre:

| Rama | Qué contiene |
|---|---|
| `main` | Lo desplegado. Solo recibe fusiones desde `release/*` o `hotfix/*`, y cada fusión lleva etiqueta de versión. |
| `develop` | La integración. De aquí salen las ramas de trabajo y aquí vuelven. |

Y tres tipos de rama temporal:

| Prefijo | Sale de | Vuelve a | Para qué |
|---|---|---|---|
| `feature/<nombre>` | `develop` | `develop` | Una historia de usuario o una parte de ella |
| `release/<versión>` | `develop` | `main` y `develop` | Cierre de sprint: se congela, se corrige y se etiqueta |
| `hotfix/<nombre>` | `main` | `main` y `develop` | Un fallo en lo desplegado que no puede esperar |

El nombre de la rama de trabajo lleva la historia del backlog cuando corresponde
a una: `feature/us020-atajos-de-teclado`.

## Mensajes de commit

Se sigue Conventional Commits. La primera línea, en minúscula y sin punto final,
no pasa de 72 caracteres:

```
<tipo>(<alcance>): <qué hace, en imperativo>

<por qué, si no es evidente. Líneas de 72 caracteres.>

Refs: US020
```

Tipos admitidos:

| Tipo | Cuándo |
|---|---|
| `feat` | Comportamiento nuevo que un usuario nota |
| `fix` | Corrección de un defecto |
| `style` | Solo presentación: tokens, espaciado, tipografía |
| `refactor` | Cambia la forma, no el comportamiento |
| `perf` | Mejora de rendimiento |
| `test` | Pruebas |
| `docs` | Documentación |
| `build` | Dependencias y empaquetado |
| `ci` | Integración continua |
| `chore` | Tareas que no encajan arriba |

Alcances de este repositorio: `audit`, `executions`, `participants`, `access`,
`shared`, `styles`.

Ejemplos:

```
feat(audit): resaltar en el código las líneas que el modelo citó
fix(shared): leer los datos de muestra solo con la marca puesta a mano
style(styles): definir la paleta en OKLCH con tema claro y oscuro
```

El commit describe el cambio y nada más: sin firmas de herramientas ni
coautorías automáticas.

## Antes de proponer un cambio

```
npx tsc --noEmit
npm run build
```

Las dos corren también en la integración continua.

## Código

Identificadores y nombres de carpeta en inglés. Comentarios y textos de interfaz
en español. Cada componente lleva su propio módulo CSS y ningún componente
escribe un color literal: todos salen de los tokens de `src/styles/tokens.css`.

Sin personalización de usuario más allá del tema. Es una decisión del diseño
experimental: si cada participante pudiera acomodar la interfaz, esa variación
entraría en los resultados.
