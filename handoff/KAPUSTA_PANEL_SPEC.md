# Kapusta — Panel del equipo (rediseño)

Spec de implementación para la pantalla que hoy es "Panel del agente" en Kapusta.
Referencia visual literal: `handoff/kapusta-panel-referencia.html` (abrir en el navegador, ancho 390px).
Alcance: **solo `slug === "kapusta"`**. No tocar Domus, Inmo Básica ni Inmo 360.

---

## 1. Principios del rediseño

1. **La marca es celeste + negro.** El arena `#D6B98C` que hoy usan los íconos y el petróleo como fondo de header no vienen del logo de Kapusta. Se eliminan de esta pantalla.
2. **La pantalla informa antes de navegar.** Hoy son cinco botones idénticos sin dato adentro. En el rediseño cada destino muestra su número (consultas sin asignar, visitas de hoy, etc.), así el usuario sabe dónde entrar sin entrar.
3. **Sin la palabra "agente" de cara al usuario.** El título "PANEL DEL AGENTE" se elimina. Ver `DOMUS_GLOSARIO_TERMINOS.md`.
4. **Sin bloques vacíos.** "HISTORIAL DE CONSUMO / Todavía no sumaste puntos" es herencia de SuperElectro y no aplica a inmobiliaria: se elimina de esta pantalla.

---

## 2. Tokens

### Color

| Uso | Hex | Nota |
|---|---|---|
| Celeste marca (fondo superior) | `#69BDE1` | ya es `background_color` en `loyalty_organizations` |
| Negro marca (texto sobre celeste, tarjeta oscura, bordes) | `#0B1417` | del logo |
| Petróleo (tarjeta secundaria, cifras de acento) | `#005F77` | `primary_color` |
| Petróleo claro | `#0180AB` | `secondary_color` / `accent_color` |
| Celeste claro (texto sobre petróleo) | `#BFE6F3` | derivado |
| Superficie / hoja inferior | `#F8FAFB` | |
| Blanco tarjeta | `#FFFFFF` | |
| Texto principal sobre claro | `#0B1417` | |
| Texto secundario | `#55666D` | |
| Texto terciario / etiquetas | `#7A888D` | |
| Línea divisoria | `#E4EAEC` | |

Los colores de marca se leen igual que hoy: `org.primary_color ?? "#005F77"` etc., inyectados inline. No agregar variables CSS scopeadas.

### Tipografía

- Familia: **Archivo** (Google Fonts, pesos 400/500/600/700/800). Es la que más se acerca al grotesco pesado del cartel. Si se prefiere no sumar una fuente, la system stack con `font-weight: 800` es aceptable, pero Archivo da el parecido con el logo.
- Wordmark "Propiedades" en el header: **Yellowtail** (script del logo), 17px.
- Escala usada:
  - Saludo: 34px / 800 / `letter-spacing: -0.035em` / `line-height: 1.02`
  - Cifra grande de tarjeta: 40px / 800 / `-0.04em`
  - Título de fila: 16px / 700
  - Texto de resumen: 15px / `line-height: 1.45`
  - Etiqueta mayúscula: 11px / 700 / `letter-spacing: 0.14em` / uppercase
  - Dato secundario: 12–13px / 400–500

### Geometría

- Radio tarjeta grande: `18px`. Hoja inferior: `28px 28px 0 0`. Chip: `20px`.
- Padding lateral de pantalla: `20–22px`.
- Separación entre tarjetas: `12px`.
- Alto mínimo de zona táctil: **48px** (las filas quedan en ~56px).

---

## 3. Estructura de la pantalla (de arriba a abajo)

### 3.1 Header (fondo celeste `#69BDE1`, sin barra petróleo)

- Izquierda: wordmark `KAPUSTA` (20px / 800 / `-0.04em` / `#0B1417`) + `Propiedades` en Yellowtail 17px `#0B1417`, alineados por baseline, gap 5px.
- Derecha: `☰` (drawer) y avatar circular 30px, fondo `#0B1417`, inicial en `#69BDE1`.
- **El saludo sale del header.** Hoy "Buenas tardes, Admin K..." se trunca dentro de la barra; pasa al cuerpo, donde entra completo.
- Los íconos de estrella / edificio / engranaje que hoy están en el header se mueven al drawer `☰`. Si se quiere conservar uno visible, que sea el de favoritos.

### 3.2 Saludo + resumen (sobre celeste, padding 0 22px 20px)

- `Buenas tardes,\nJosefina` — 34px / 800, dos líneas, negro.
- Debajo, 12px de aire: el texto del resumen del día generado por IA, 15px, color `#103038`, `max-width: 300px`, `text-wrap: pretty`.
- **Se elimina la tarjeta blanca "RESUMEN DEL DÍA"**: el resumen ya no necesita contenedor, es la bajada del saludo.
- Si el resumen viene vacío o falla la IA, mostrar una línea corta con el conteo real ("Cuatro consultas esperan respuesta.") en vez de "Todo tranquilo por ahora".

### 3.3 Hoja inferior (`#F8FAFB`, radio superior 28px, padding 22px 20px, gap 12px)

**a) Dos tarjetas métricas, lado a lado (`display:flex; gap:12px`)**

| | Izquierda | Derecha |
|---|---|---|
| fondo | `#0B1417` | `#005F77` |
| cifra | 40px/800, `#69BDE1` | 40px/800, `#FFFFFF` |
| etiqueta | `CONSULTAS`, 14px/700 uppercase `#FFFFFF` | `VISITAS HOY`, 14px/700 uppercase `#BFE6F3` |
| dato | consultas sin asignar | visitas confirmadas para hoy |
| destino | pantalla de Consultas | Reuniones/Visitas |

Cifra arriba, etiqueta abajo, separadas por `gap: 20px`, padding 16px.

**b) Tres filas (tarjeta blanca, borde `1.5px solid #0B1417`, radio 18px, padding 16px 18px, `justify-content: space-between`)**

1. `Ofertas y reservas` — chip celeste `#69BDE1` con texto negro 12px/700 y el conteo de nuevas ("2 nuevas") + chevron `›`.
2. `Seguimiento` — dato en gris `#55666D` ("7 en curso") + chevron.
3. `Cartera de clientes` — dato en gris ("41 fichas") + chevron.

El chip celeste aparece **solo cuando hay pendientes**; si el conteo es 0, se muestra el dato en gris como las otras filas.

**c) Próxima visita** (separada por `border-top: 1px solid #E4EAEC`, `padding-top: 14px`)

- Etiqueta `PRÓXIMA VISITA` (11px uppercase `#7A888D`), debajo el título de la propiedad + zona (15px/600 `#10262E`).
- A la derecha, la hora: 18px/800 `#005F77`.
- Si no hay visitas próximas, el bloque no se renderiza (no dejar el hueco).

---

## 4. Datos que hay que traer

Todos existen ya en la base; hoy la pantalla no los consulta.

| Campo | Fuente |
|---|---|
| consultas sin asignar | consultas con `assigned_to is null` (o asignadas al usuario, según rol) |
| visitas de hoy | turnos con estado `confirmed` y fecha = hoy |
| ofertas/reservas nuevas | ofertas + reservas en estado pendiente |
| seguimientos en curso | registros de seguimiento abiertos |
| fichas de cartera | clientes de la org (o del profesional si `role = agente`) |
| próxima visita | primer turno confirmado con fecha/hora >= ahora |

Con `role = admin` los conteos son de toda la org; con `role = agente`, solo los propios (igual que la lógica actual de Consultas).

---

## 5. Qué NO cambiar

- La lógica de asignación de consultas, turnos, ofertas y reservas.
- Las rutas y los destinos de cada botón (mismos cinco).
- El drawer lateral y su contenido, más allá de recibir los íconos que salen del header.
- Domus y los demás slugs: esta pantalla se rediseña con el mismo guard que ya usan las calculadoras (`slug === "kapusta"`).

---

## 6. Prompt sugerido para CC

> Rediseñá la pantalla del panel del equipo de Kapusta (hoy "Panel del agente") siguiendo `handoff/KAPUSTA_PANEL_SPEC.md`. La referencia visual literal está en `handoff/kapusta-panel-referencia.html` (mirala a 390px de ancho). Aplicá el rediseño **solo** cuando `slug === "kapusta"`, dejando la versión actual intacta para Domus y el resto de los slugs. Traé los conteos reales indicados en la sección 4 (no hardcodees números). Respetá el glosario de `DOMUS_GLOSARIO_TERMINOS.md`: ningún texto de cara al usuario dice "agente". No corras `npm run build` sin avisar y no pushees a main; dejá el commit local.
