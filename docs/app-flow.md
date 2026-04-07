# Koma — Documentación completa de la aplicación

> Versión: 1.0 · Fecha: 2026-03-29
> Para: portfolio, referencia técnica y manual de usuario

---

## ¿Qué es Koma?

Koma es una aplicación web personal para gestionar colecciones de cómics. Permite al coleccionista llevar un registro de lo que tiene, lo que ha leído, lo que quiere conseguir y lo que ha prestado — todo desde una interfaz limpia y rápida.

Se integra con la **Grand Comics Database (GCD)**, una base de datos local de cómics (europeos, americanos y más), para importar información rica: portadas, creadores, sinopsis, series completas, ISBN, precio, etc. Los cómics también se pueden añadir manualmente si no están en GCD.

La app incluye además **recomendaciones por IA** basadas en la colección personal, y **completitud de series** para saber exactamente qué números faltan de cada serie.

---

## Mapa de la aplicación

```
┌─────────────────────────────────────────────────────────────┐
│                    KOMA — Mapa de rutas                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /login          Pantalla de inicio de sesión               │
│  /register       Pantalla de registro                       │
│                                                             │
│  /dashboard      Resumen de la colección (home)             │
│  /library        Biblioteca personal — todos los cómics     │
│  /search         Buscador en GCD + añadir manualmente       │
│  /comics/:id     Ficha detallada de un cómic                │
│  /collections    Colecciones temáticas del usuario          │
│  /discover       Recomendaciones IA + resumen de series     │
│  /settings       Cuenta, idioma, tema, seguridad, datos     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Todas las rutas excepto `/login` y `/register` requieren sesión activa. Si no hay sesión, redirigen automáticamente al login.

---

## Flujo completo del usuario

### 1. Primera vez en la app

```
Usuario entra en la app por primera vez
        │
        ▼
  /register — crea su cuenta (email + username + contraseña)
        │
        ▼
  /dashboard — ve su colección vacía con accesos rápidos
        │
        ├──► /search — busca sus primeros cómics en GCD
        │       │
        │       └──► Los importa → van a /library como "Tengo"
        │
        └──► /library — empieza a ver y gestionar su colección
```

### 2. Uso habitual (coleccionista activo)

```
Usuario abre la app
        │
        ▼
  /dashboard — revisa sus estadísticas (cuántos tiene, ha leído, etc.)
        │
        ├──► Acaba de comprar un cómic → /search → busca → importa
        │
        ├──► Quiere ver qué le falta de una serie → /library
        │       └──► "Ver qué falta" en el grupo de serie
        │
        ├──► Presta un cómic → /comics/:id → activa "Prestado a Juan"
        │
        ├──► Termina de leer → /comics/:id → activa "Leído" + pone 5★
        │
        └──► Quiere descubrir algo nuevo → /discover → genera recomendaciones IA
```

### 3. Gestión avanzada

```
Usuario quiere organizar su colección
        │
        ├──► /library → filtra por "Wishlist" → ve qué quiere comprar
        │       └──► Filtra por editorial + rango de años
        │
        ├──► /collections → crea "Mis novelas gráficas favoritas"
        │       └──► Añade cómics de la biblioteca a esa colección
        │
        ├──► /comics/:id → abre un cómic con datos incompletos
        │       └──► Edita portada, sinopsis, estilo de dibujo, etiquetas
        │
        └──► /settings → exporta toda la biblioteca en CSV/JSON
```

---

## Descripción detallada por pantalla

---

### Pantalla de Login (`/login`)

**Propósito:** acceder a la cuenta existente.

**Elementos:**
- Campo de email (validación de formato en tiempo real)
- Campo de contraseña (mínimo 1 carácter para poder enviar)
- Botón "Iniciar sesión" (deshabilitado mientras se procesa)
- Link para ir a registro
- Toggle de tema claro/oscuro (accesible sin login)

**En desktop (≥ 768px):** layout de dos paneles. El panel de color (primario) está a la derecha y muestra el tagline de bienvenida. El formulario está a la izquierda.

**Comportamiento tras login exitoso:** redirige a `/dashboard`. Si ya había sesión activa, redirige a `/dashboard` directamente sin mostrar el formulario.

**Errores:**
- Email o contraseña incorrectos → toast rojo "Email o contraseña incorrectos"
- Campos sin rellenar → errores de validación inline bajo cada campo

---

### Pantalla de Registro (`/register`)

**Propósito:** crear una cuenta nueva.

**Campos y validaciones:**

| Campo | Regla |
|---|---|
| Email | Formato válido (nombre@dominio.ext) |
| Username | 3–30 caracteres |
| Contraseña | Mínimo 6 caracteres |

**En desktop:** el panel de color está a la izquierda con el tagline "Tu colección, siempre contigo". Al pulsar el link de cambio, el panel se desliza hacia la derecha (animación ~400ms) y aparece el formulario de login.

**Tras registro exitoso:** login automático + redirige a `/dashboard`.

**Errores:**
- Email ya registrado → toast "Email ya en uso"
- Validación inline bajo cada campo en tiempo real

---

### Dashboard (`/dashboard`)

**Propósito:** visión general rápida de la colección.

**Contenido:**

**Saludo personalizado** según la hora:
- 00:00–11:59 → "Buenos días, [username]"
- 12:00–19:59 → "Buenas tardes, [username]"
- 20:00–23:59 → "Buenas noches, [username]"

**Contador de colección:** "Tienes X cómics en tu colección" (el número es un enlace a `/library`).

**4 tarjetas de estadísticas:**

| Tarjeta | Qué muestra |
|---|---|
| Tengo | Número de cómics marcados como poseídos |
| Leídos | Número de cómics marcados como leídos |
| Wishlist | Número de cómics en lista de deseos |
| Favoritos | Número de cómics marcados como favoritos |

**Valoración media:** si hay cómics puntuados, muestra "X.X ★ de N valorados".

**Accesos rápidos:** botones grandes a "Mi Biblioteca" (`/library`) y "Buscar cómics" (`/search`).

**Nota:** un cómic puede estar en varios estados simultáneamente (ej. "Tengo" + "Leído" + "Favorito"), por lo que la suma de las 4 tarjetas puede ser mayor que el total de cómics.

---

### Buscador GCD (`/search`)

**Propósito:** encontrar cómics en la base de datos Grand Comics Database e importarlos a la colección personal.

#### Búsqueda en GCD

**Cómo buscar:**
1. Escribir el título o nombre de serie en el campo principal
2. Opcionalmente añadir filtros: editorial, creador/autor, año de publicación
3. Pulsar "Buscar" (o Enter)

**Filtros avanzados (siempre visibles):**
- **Editorial:** texto libre (ej. "Dargaud", "Marvel")
- **Creador/Autor:** texto libre (ej. "Moebius", "Alan Moore")
- **Año:** número entre 1900 y el año actual

Los filtros se combinan con la búsqueda por texto. Se pueden usar filtros solos sin texto.

**Resultados GCD — modo serie (por defecto):**
- Grid de tarjetas de serie: nombre, editorial, años de publicación, número de issues
- Al hacer click en una tarjeta de serie → se abre el sheet lateral de issues

**Sheet lateral de issues de la serie:**
```
Astérix (Goscinny & Uderzo)
■■■■░░░░░░  5 de 37 números  (13%)

#1  Astérix el Galo          [+ Añadir]
#2  La hoz de oro            [✓ En colección]
#3  Astérix y los godos      [+ Añadir]
...
```
- Botón "Añadir" por issue → importa de GCD + añade como "Tengo"
- Issues ya en la colección muestran ✓ verde

**Resultados fuentes externas (Google Books, Open Library, Tebeosfera, Whakoom):**
- Grid de tarjetas con portada, título, autor, editorial, año
- Botón "Añadir" en cada tarjeta → añade como "Tengo"
- Paginación de 20 en 20

#### Añadir manualmente

Disponible en fuentes externas cuando la búsqueda no da resultados.

**Campos:**
- Título (obligatorio — botón deshabilitado si está vacío)
- Issue #, Año, Editorial, URL de portada

El cómic creado manualmente queda en la biblioteca como "Tengo" sin datos externos.

#### Caso de uso típico

> El usuario quiere añadir todos los Astérix que tiene. Busca "Asterix" en GCD (fuente por defecto, modo serie). Ve la card de la serie "Astérix" (Dargaud, 1961–actualidad, 37 números). La pulsa, y el sheet lateral muestra todos los 37 issues indicando cuáles ya tiene en su colección. Pulsa "Añadir" en los que tiene físicamente. Todos se añaden como "Tengo" a la biblioteca.

---

### Biblioteca (`/library`)

**Propósito:** gestionar y consultar toda la colección personal. Es la pantalla más usada de la app.

#### Vista de tarjetas

Cada tarjeta muestra:
- **Portada** (imagen) o icono libro (si no hay portada)
- **Título** y número de issue
- **Editorial** y número (si existen)
- **Etiquetas** del cómic (chips grises)
- **Badges de estado** activos: `Tengo`, `Leídos`, `Wishlist`, `Favorito`, `Prestado`
- **Badge ⚠** (ámbar, esquina superior derecha) si faltan portada o sinopsis
- **Botón papelera** (esquina inferior derecha) para eliminar de la biblioteca

#### Búsqueda en la propia colección

La barra de búsqueda filtra en tiempo real (debounce 300ms) sobre:
- Título del cómic
- Nombre de la serie
- Editorial

Al escribir, los resultados se actualizan solos sin pulsar Enter. La X limpia la búsqueda.

#### Filtros por etiqueta

Chips de colores con las etiquetas que el usuario ha asignado a sus cómics. Al pulsar uno, filtra para mostrar solo los cómics con esa etiqueta. Volver a pulsarlo lo deselecciona.

#### Filtros por estado

Botones: **Todos · Tengo · Leídos · Wishlist · Favoritos**

Muestran solo los cómics con ese estado activo. Combinables con la búsqueda y las etiquetas.

#### Filtros avanzados (panel desplegable)

El botón "Más filtros" abre un panel con:
- **Editorial:** texto libre (debounce 300ms)
- **Año desde:** número
- **Año hasta:** número

Cuando hay filtros activos, el botón muestra un badge con el número de filtros activos (ej. "Más filtros ①"). Un botón "Limpiar filtros" dentro del panel los resetea.

Todos los filtros (búsqueda + etiqueta + estado + avanzados) son **combinables entre sí**.

#### Ordenación

Menú desplegable con opciones:
- **Serie** (por defecto) — agrupa los cómics por serie
- **Título** — A→Z
- **Año** — más antiguo primero
- **Añadido** — más reciente primero
- **Puntuación** — mayor valoración primero

#### Vista de series (por defecto, `sortBy=series_asc`)

Cuando la ordenación es "Serie", la biblioteca muestra **una tarjeta por serie**:

```
[portada]  Astérix
           Dargaud
           ■■■■░░░░  12/37 · 32%
           [Ver completitud →]

[portada]  Blake y Mortimer
           Le Lombard
           ■■░░░░░░  5/24 · 20%
           [Ver completitud →]
```

- La portada es la del primer issue importado (o la de la entidad Series si existe)
- La barra de progreso aparece cuando la serie está enlazada a GCD y tiene `totalIssues`
- Si todos los números están en colección → barra verde "¡Serie completa!"
- El botón "Ver completitud" (o click en la tarjeta) abre el panel lateral

#### Panel de completitud de serie

Se abre como sheet lateral al pulsar "Ver completitud" o al clicar la tarjeta de serie:

```
Astérix

■■■■■■■■░░  12 de 37 números  (32%)

#1  Astérix el Galo           [✓ En colección]
#2  La hoz de oro             [✓ En colección]
#3  Astérix y los godos       [🔖 Añadir a wishlist]
#4  Astérix Gladiador         [🔖 Añadir a wishlist]
...
```

Al pulsar "Añadir a wishlist" en un número:
1. El issue se importa desde GCD (crea/enlaza la entidad Serie automáticamente)
2. Se añade a la biblioteca con estado "Wishlist"
3. El botón cambia a ✓ verde sin recargar
4. La barra de progreso se actualiza localmente

#### Eliminar un cómic

Requiere doble confirmación para evitar borrados accidentales:
1. Clic en 🗑 → icono cambia a ✓
2. Clic en ✓ → confirma el borrado

El cómic desaparece de la biblioteca (pero no se elimina de la BD local — se puede volver a añadir desde GCD o búsqueda).

#### Paginación

20 cómics por página. Los botones `<` y `>` deshabilitados en primera/última página.

#### Caso de uso típico

> El usuario quiere ver qué le falta de la serie "XIII". Entra en biblioteca, la ordenación está en "Serie" (por defecto), y ve la tarjeta "XIII" con "7/29 números (24%)". Pulsa la tarjeta y el sheet lateral le muestra los 29 issues: los 7 que tiene en verde y los 22 que faltan. Pulsa "Añadir a wishlist" en los que le interesan. La barra de progreso se actualiza en tiempo real. Después filtra por "Wishlist" para ver su lista de compra pendiente.

---

### Ficha de cómic (`/comics/:id`)

**Propósito:** ver y gestionar toda la información de un cómic en detalle.

#### Sección Hero (cabecera)

```
[Portada]   Título del cómic
            #Nº · Editorial · Año · Precio · Páginas
            [✏ Editar]

            ⚠ Le faltan portada y/o sinopsis
```

Si el cómic tiene datos incompletos (sin portada o sin sinopsis), aparece un banner ámbar de aviso.

El botón ✏ abre el panel de edición (EditSheet).

#### EditSheet — panel de edición de metadatos

Sheet lateral con todos los campos editables:

| Campo | Tipo | Validación |
|---|---|---|
| Título | Texto | Obligatorio (Guardar deshabilitado si vacío) |
| Editorial | Texto | Libre |
| Año | Número | 1900–2099 |
| Serie | Texto | Libre |
| URL de portada | URL | Libre (el backend valida formato URL) |
| ISBN | Texto | Libre |
| Encuadernación | Select | Cartoné / Tapa blanda / Bolsillo / Omnibus / Tapa dura |
| Estilo de dibujo | Texto | Libre (ej. "Línea clara", "Realista") |
| Sinopsis | Área de texto | Libre |

Al guardar: los cambios se reflejan inmediatamente en la ficha y en las tarjetas de la biblioteca.

#### Gestión de etiquetas

Zona de etiquetas siempre visible en el hero:

```
[novela-negra ×]  [aventura ×]  [escribir aquí...]
```

- Escribir una etiqueta y pulsar **Enter** → se crea y asigna
- Si la etiqueta ya existe en otra del usuario, el autocompletado la sugiere al escribir
- Pulsar × en una etiqueta → la elimina de ese cómic
- Las etiquetas son compartidas entre cómics del mismo usuario

**Uso típico:** etiquetar un cómic como "línea-clara", "noir", "sci-fi" para luego filtrar por género en la biblioteca.

#### Estado personal

```
[☑ Tengo]  [☐ Leído]  [☑ Wishlist]  [☐ Favorito]

[☐ Prestado]  Prestado a: ________________
```

Los estados son **independientes y acumulables**. Un mismo cómic puede estar en "Tengo" + "Leído" + "Favorito" simultáneamente.

El campo "Prestado a" se activa cuando se marca "Prestado" y permite escribir el nombre de quien lo tiene.

#### Puntuación con estrellas

```
★ ★ ★ ☆ ☆   (3 de 5)
```

- Clic en una estrella → pone esa puntuación (1–5)
- La media del dashboard se actualiza automáticamente

#### Notas personales

Textarea con autoguardado: el texto se guarda 500ms después de dejar de escribir, sin necesidad de pulsar ningún botón. El usuario puede escribir libremente.

#### Secciones de información (desde GCD)

Solo visibles si el cómic fue importado desde GCD y GCD tiene esos datos:

**Sinopsis:** texto descriptivo del contenido.

**Creadores** (agrupados por rol):
```
Guion      Alan Moore, Grant Morrison
Dibujo     Dave Gibbons
Tintas     —
Color      John Higgins
Rótulos    Todd Klein
```

**Historias:** cada relato del número con: tipo (cómic, portada, texto...), número de páginas, género, personajes que aparecen, sinopsis, primera línea de diálogo.

**Serie:** nombre de la serie, formato de publicación, años de inicio/fin, total de números publicados, fechas de publicación, color (B&N o color), dimensiones, tipo de papel, encuadernación, formato editorial.

**Editorial:** nombre, años de actividad, web oficial (enlace externo).

**Publicación:** precio original, fecha de venta, código de barras, ISBN.

#### Dónde comprar

Visible solo si el cómic está en **Wishlist** y tiene **ISBN**:

```
Dónde comprarlo

ISBN: 978-84-679-1234-5  [📋 Copiar]

[Amazon.es]  [FNAC.es]  [🔍 Buscar en Google]
```

- El botón "Copiar" copia el ISBN al portapapeles con confirmación toast
- Los botones abren el buscador externo con el ISBN prellenado

**Uso típico:** el usuario marca como Wishlist un cómic que quiere comprar. La ficha le muestra directamente los links de compra.

#### Añadir a la biblioteca

Si el cómic no está en la biblioteca del usuario (acceso desde URL directa o link externo), aparece un botón "Añadir a biblioteca" que lo añade con estado "Tengo".

---

### Colecciones (`/collections`)

**Propósito:** organizar cómics en listas temáticas personalizadas (independientes de los estados).

**Casos de uso:**
- "Mis novelas gráficas favoritas"
- "Cómics de Moebius"
- "Lista para regalar a mi sobrino"
- "Lectura de verano"

#### Crear una colección

1. Pulsar "Nueva colección"
2. Nombre (obligatorio, máx 60 caracteres)
3. Descripción (opcional, máx 200 caracteres)
4. Visibilidad: Privada (por defecto) o Pública
5. Pulsar "Crear"

#### Vista de colecciones

Cada colección muestra: nombre, descripción, contador de cómics, badge de visibilidad (Pública/Privada), botones editar/eliminar.

Al pulsar sobre una colección, se expande mostrando las portadas de los cómics que contiene.

#### Añadir cómics a una colección

Selector con todos los cómics de la biblioteca (solo los que no están ya en la colección). Al seleccionar, el cómic se añade inmediatamente.

Un cómic puede estar en múltiples colecciones. Las colecciones son independientes de los estados (Tengo, Leído, etc.).

#### Eliminar colección

Pide confirmación antes de borrar. Al eliminar la colección no se eliminan los cómics de la biblioteca.

---

### Descubrir (`/discover`)

**Propósito:** explorar nueva contenido basado en los gustos del usuario.

#### Recomendaciones por IA

La app analiza la colección del usuario y genera 6 recomendaciones personalizadas usando Claude (Anthropic AI, modelo Haiku).

**Qué analiza:**
- Series en la colección (las 20 más relevantes)
- Editoriales favoritas (las 10 primeras)
- Etiquetas asignadas (los 15 géneros/categorías)
- **Estilos de dibujo** anotados en los cómics

**El prompt da prioridad especial al dibujante y estilo gráfico**, ya que para muchos coleccionistas el estilo visual es tan importante o más que el argumento.

Cada recomendación muestra:
- Título
- Autor/dibujante principal
- Justificación personalizada: "Por qué te gustará dado lo que ya tienes"

**Para generarlas:** pulsar el botón "Generar recomendaciones". La petición tarda unos segundos (depende de la API de Anthropic).

**Limitación:** requiere tener al menos algunos cómics marcados como "Tengo" para que el análisis sea relevante.

#### Resumen de series

Lista de todas las series presentes en la colección, ordenadas de mayor a menor número de issues poseídos.

```
Astérix                 12 números
XIII                     7 números
Blake y Mortimer         5 números
...
```

Cada elemento es un enlace a `/library`. Útil para tener visión rápida de qué series tiene más representadas.

---

### Ajustes (`/settings`)

**Propósito:** configurar la cuenta y preferencias de uso.

#### Sección Cuenta

**Cambiar nombre de usuario:**
- Mínimo 3, máximo 30 caracteres
- Si el nombre ya está en uso (por otro usuario), muestra error específico
- El cambio se refleja en el saludo del dashboard y en la sidebar

#### Sección Apariencia

**Idioma:**
- Español (ES)
- English (EN)
- El cambio es inmediato sin recargar la página
- Se guarda en el servidor (persiste entre dispositivos) y en localStorage

**Tema:**
- Claro
- Oscuro
- Sistema (sigue el tema del sistema operativo)
- Persiste entre sesiones

#### Sección Datos

**Exportar biblioteca en CSV:** descarga un fichero `koma-library.csv` con todos los cómics de la colección y sus metadatos:
```
title, series, issueNumber, publisher, year, isbn, binding,
isOwned, isRead, isWishlist, isFavorite, rating, notes, addedAt
```

**Exportar biblioteca en JSON:** descarga `koma-library.json` con la misma información en formato estructurado. Útil para backup o para migrar datos a otra aplicación.

#### Sección Seguridad

**Cambiar contraseña:**
- Contraseña actual (verificada en el servidor)
- Nueva contraseña (mínimo 6 caracteres)
- Confirmar nueva contraseña (debe coincidir exactamente)

Si la contraseña actual es incorrecta, muestra error específico (no genérico). Los campos se resetean tras éxito.

---

## Sistema de etiquetas (tags)

Las etiquetas son una funcionalidad transversal a toda la app.

### Cómo funcionan

- **Ámbito por usuario:** cada usuario tiene sus propias etiquetas. No se comparten entre usuarios.
- **Ámbito por cómic:** un cómic puede tener múltiples etiquetas. La misma etiqueta puede estar en múltiples cómics.
- **Creación:** se crean al asignarlas por primera vez a un cómic (desde la ficha de cómic).
- **Slug automático:** cada etiqueta tiene un slug normalizado (sin tildes, sin espacios). "Línea clara" → `linea-clara`. Esto permite filtrar sin problemas de acentuación.

### Dónde se usan

| Lugar | Qué permite |
|---|---|
| Ficha de cómic | Crear, asignar y eliminar etiquetas |
| Biblioteca | Filtrar cómics por etiqueta (chips) |
| IA de Discover | Las etiquetas se incluyen como contexto para las recomendaciones |

### Flujo de ejemplo

```
1. En /comics/123 → escribir "noir" + Enter → etiqueta creada y asignada
2. En /library → chip "noir" aparece en la fila de etiquetas
3. Clic en "noir" → solo aparecen cómics con esa etiqueta
4. En /discover → la IA sabe que el usuario tiene cómics "noir" y recomienda en consecuencia
```

---

## Sistema de estados (multi-flag)

Un cómic puede tener **varios estados activos simultáneamente**. Esto es diferente a otros gestores de colección que solo permiten un estado exclusivo.

### Estados disponibles

| Estado | Badge | Uso |
|---|---|---|
| `Tengo` | Morado claro | Lo poseo físicamente |
| `Leído` | Verde | Lo he leído |
| `Wishlist` | Azul | Lo quiero conseguir |
| `Favorito` | Naranja/coral | Especialmente recomendado |
| `Prestado` | Violeta | Lo tengo prestado a alguien |

### Combinaciones típicas

| Combinación | Significado |
|---|---|
| Tengo | Está en la colección, sin leer aún |
| Tengo + Leído | Lo tengo y ya lo he leído |
| Tengo + Leído + Favorito | Lo tengo, leído y es de mis favoritos |
| Tengo + Prestado | Lo tengo pero está prestado a alguien |
| Wishlist | Quiero conseguirlo, no lo tengo |

### Implicaciones en la interfaz

- En **biblioteca**: los badges muestran todos los estados activos simultáneamente
- En **dashboard**: las estadísticas cuentan cada estado independientemente (la suma puede superar el total)
- En **ficha**: cada toggle es independiente; activar "Tengo" no desactiva "Wishlist"
- **"Dónde comprar"**: solo aparece cuando `isWishlist=true` e `isbn` disponible

---

## Integración con GCD (Grand Comics Database)

GCD es una base de datos comunitaria de cómics. La app usa una **copia local** en MySQL que se consulta directamente — no hay llamadas a internet para las búsquedas.

### Qué datos proporciona GCD

- Metadatos del issue: título, número, editorial, año, precio, páginas, fecha de venta, código de barras, ISBN
- **Creadores** con su rol exacto: guionista, dibujante, entintador, colorista, rotulista, editor
- **Historias** del número: cada relato independiente con su título, tipo, género, personajes, sinopsis
- **Serie**: nombre, formato, años de publicación, número total de issues, color, dimensiones, papel, encuadernación
- **Editorial**: nombre, web oficial, años de actividad
- **Portada**: se obtiene via Open Library a partir del ISBN válido cuando GCD lo tiene

### Proceso de importación

```
Usuario busca "Blacksad" en /search
           │
           ▼
  GCD devuelve los issues que coinciden
           │
           ▼
  Usuario pulsa "Añadir a biblioteca"
           │
           ▼
  La app guarda los datos de ese issue en la BD local (PostgreSQL)
  como un cómic propio del usuario
           │
           ▼
  El cómic aparece en /library con todos sus datos de GCD
  y con el campo externalId que lo vincula a GCD
           │
           ▼
  En /comics/:id → la app consulta GCD en tiempo real
  para mostrar creadores, historias, serie, editorial
```

### Completitud de series

Funciona gracias al vínculo con GCD:
1. La app toma el `externalId` de un cómic de la serie
2. Consulta GCD: "¿cuántos issues tiene esta serie en total?"
3. Cruza con la biblioteca del usuario: "¿cuáles de esos issues tiene?"
4. Devuelve: lista de issues que faltan + porcentaje de completitud

Solo funciona para cómics importados desde GCD (no para cómics añadidos manualmente).

---

## Puntuación y valoraciones

### Cómo puntuar

Desde la ficha de cómic (`/comics/:id`), en la sección de estado personal:
- 5 estrellas interactivas
- Clic en la estrella N → pone puntuación N (1–5)
- La puntuación se guarda inmediatamente

### Dónde aparece

- **Dashboard:** media de todos los cómics puntuados + contador de cuántos están valorados
- **Biblioteca:** ordenación por "Puntuación" (mayor valoración primero)
- **Export CSV/JSON:** columna `rating` con el valor (1–5) o vacío si sin puntuar

---

## Préstamos

### Registrar un préstamo

1. Ir a `/comics/:id`
2. Activar el toggle "Prestado"
3. Escribir el nombre de la persona en "Prestado a"

El campo "Prestado a" es texto libre. No hay sistema de seguimiento automatizado — es solo un registro personal.

### Consultar préstamos activos

En `/library` con el filtro de estado "Prestado" (visible en los filtros). También se puede buscar por nombre en la barra de búsqueda si se recuerda el título.

---

## Exportación de datos

### CSV

Formato estándar compatible con Excel, Google Sheets, Numbers.

Columnas:
```
title | series | issueNumber | publisher | year | isbn | binding |
isOwned | isRead | isWishlist | isFavorite | rating | notes | addedAt
```

Los valores booleanos (`isOwned`, etc.) aparecen como `true`/`false`.

### JSON

Array de objetos con la misma estructura que el CSV. Útil para procesar programáticamente o como backup.

Ambos formatos incluyen **todos** los cómics de la colección sin paginación.

---

## Internacionalización (i18n)

La app está completamente traducida a dos idiomas:

| Idioma | Código | Selección |
|---|---|---|
| Español | `es` | Por defecto al registrarse |
| English | `en` | Seleccionable en Ajustes |

El cambio de idioma es **instantáneo** sin recargar la página. La preferencia se guarda en el servidor (disponible en cualquier dispositivo) y en `localStorage` (disponible offline).

---

## Errores y estados de carga

### Estados de carga

- **Skeletons:** mientras cargan las listas (biblioteca, búsqueda), aparecen placeholders animados que tienen la misma forma que las tarjetas reales. Evitan el salto de layout (layout shift).
- **Spinners:** en botones de acción (añadir, guardar) mientras procesa.
- **Disable de botones:** los botones de submit se deshabilitan mientras hay una operación en curso para evitar doble envío.

### Errores

- **Toasts de error** (rojo): aparecen en la esquina de la pantalla y se autoeliminan. Mensajes específicos según el error (contraseña incorrecta, usuario en uso, error de red, etc.)
- **Estados vacíos:** cuando una búsqueda o filtro no da resultados, aparece un mensaje contextual con sugerencia de acción (limpiar filtros, buscar en GCD, etc.)
- **404 de cómic:** si se accede a `/comics/:id` con un ID inválido, aparece un mensaje "Cómic no encontrado" con opción de volver

---

## Casos de uso del usuario final

### Caso 1: Registrar una compra nueva

**Contexto:** el usuario acaba de comprar "El Eternauta" en la librería.

1. Abre Koma → `/search`
2. Escribe "Eternauta" en el buscador → pulsa Buscar
3. Ve el resultado en GCD → pulsa el título para ver el detalle (creadores, sinopsis)
4. Pulsa "Añadir a biblioteca"
5. Va a `/comics/:id` → activa "Tengo" si no está ya activo
6. Añade etiqueta "sci-fi" y "argento" → Enter
7. Sale. El cómic aparece en su biblioteca con portada y todos los datos de GCD.

---

### Caso 2: Registrar una lectura con valoración

**Contexto:** el usuario acaba de terminar de leer "Maus".

1. Va a `/library` → busca "Maus" en la barra de búsqueda
2. Pulsa la tarjeta → va a `/comics/:id`
3. Activa el toggle "Leído"
4. Pulsa la 5ª estrella (valoración máxima)
5. Escribe en las notas: "Obra fundamental. El arte en blanco y negro potencia el impacto."
6. Las notas se guardan automáticamente a los 500ms.
7. En el dashboard, la media de valoración sube.

---

### Caso 3: Preparar la lista de compra

**Contexto:** el usuario va a ir a la feria del cómic el próximo fin de semana.

1. Va a `/library` → "Ver qué falta" en la serie Corto Maltés
2. El panel muestra: faltan 8 de 15 números. Ve cuáles son.
3. Pulsa "Añadir a wishlist" en los 3 que más le interesan
4. Cierra el panel → filtra la biblioteca por "Wishlist"
5. Ve todos los cómics que quiere comprar (incluyendo los de wishlist de otras series)
6. Para cada uno con ISBN, entra en la ficha y ve los precios estimados en Amazon/FNAC
7. Antes de salir, exporta la lista en CSV desde `/settings` → Datos → Exportar CSV

---

### Caso 4: Registrar un préstamo

**Contexto:** el usuario le presta "Persépolis" a un amigo.

1. Va a `/library` → busca "Persépolis"
2. Pulsa la tarjeta → va a `/comics/:id`
3. Activa "Prestado" → escribe "Carlos" en "Prestado a"
4. El badge "Prestado" aparece en la tarjeta de la biblioteca
5. Semanas después, cuando quiere saber qué tiene prestado, va a `/library` → filtra por "Prestado"
6. Ve "Persépolis — Carlos" → va a la ficha → desactiva "Prestado" cuando lo recupera

---

### Caso 5: Descubrir cómics nuevos

**Contexto:** el usuario quiere leer algo nuevo pero no sabe qué.

1. Va a `/discover`
2. Pulsa "Generar recomendaciones" (tarda ~5 segundos)
3. Aparecen 6 recomendaciones con justificación personalizada:
   - "Dado que tienes Moebius y te gusta el estilo de línea clara, te encantará Blueberry de Jean Girard"
4. Anota los que le interesan → va a `/search` y los busca
5. Los que encuentra en GCD los añade como "Wishlist"

---

### Caso 6: Organizar la colección con etiquetas

**Contexto:** el usuario quiere poder filtrar rápidamente por género.

1. Abre varios cómics desde `/library` → en cada ficha añade etiquetas: "franco-belga", "noir", "aventura", "sci-fi", "superhéroes"
2. Vuelve a `/library` → ve los chips de etiquetas en la fila de filtros
3. Pulsa "noir" → aparecen solo los cómics de ese género
4. Combina "noir" + filtro "Leído" → ve solo los noir que ya ha leído

---

## Glosario

| Término | Significado |
|---|---|
| GCD | Grand Comics Database — base de datos de cómics usada como catálogo |
| Issue | Número individual de una serie de cómics |
| Serie | Conjunto de issues relacionados bajo el mismo título |
| Tengo | Estado: el usuario posee físicamente el cómic |
| Wishlist | Lista de deseos: el usuario quiere conseguir el cómic |
| Slug | Versión normalizada de una etiqueta (sin espacios ni acentos), usada internamente |
| Cartoné | Encuadernación de tapa dura con lomo cuadrado, habitual en cómic europeo |
| JWT | Token de autenticación guardado en localStorage para mantener la sesión |
| Debounce | Técnica que retrasa la ejecución de una acción hasta que el usuario deja de escribir |
| Toast | Notificación temporal (éxito/error) que aparece en la esquina de la pantalla |
| Skeleton | Placeholder visual animado que se muestra mientras carga el contenido real |
