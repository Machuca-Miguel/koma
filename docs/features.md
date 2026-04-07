# Features — Koma

> Actualizado: 2026-04-01 · Stack: NestJS 11 + Prisma 7 + PostgreSQL (Neon) + React 19 + Vite + TanStack Query + shadcn/ui + Tailwind v4

---

## Flujo general de la aplicación

```
/login o /register
       │
       ▼ (JWT guardado en localStorage)
  /dashboard  ←──── acceso rápido a biblioteca y búsqueda
       │
       ├── /library        → gestión y consulta de la colección personal
       ├── /search         → búsqueda en GCD e importación
       ├── /comics/:id     → ficha completa de un cómic
       ├── /collections    → colecciones temáticas
       ├── /discover       → recomendaciones IA + resumen de series
       └── /settings       → cuenta, apariencia, datos, seguridad
```

Todas las rutas bajo `/` requieren autenticación. Las rutas `/login` y `/register` redirigen a `/dashboard` si ya hay sesión activa. Cualquier ruta inexistente redirige a `/dashboard`.

---

## Funcionalidades implementadas

### 1. Autenticación (`/login`, `/register`)

- Registro con email, username (3–30 chars) y contraseña (mínimo 6 chars)
- Login con email y contraseña
- Validación en tiempo real con React Hook Form + Zod
- JWT almacenado en localStorage; sesión persistente entre recargas
- Panel animado (desktop): slide entre login y registro sin recargar la página
- Redirección automática según estado de autenticación
- Theme toggle (claro/oscuro) accesible desde la pantalla de auth

### 2. Dashboard (`/dashboard`)

- Saludo personalizado según hora del día (mañana / tarde / noche)
- Contador de cómics totales con enlace directo a la biblioteca
- Tarjetas de estadísticas: `Tengo`, `Leído`, `Wishlist`, `Favorito`
- Valoración media de los cómics puntuados (con contador de valorados)
- Accesos rápidos: "Mi Biblioteca" y "Buscar cómics"

### 3. Biblioteca (`/library`)

**Vista de series (por defecto cuando `sortBy=series_asc`):**
- Una tarjeta por serie con: portada (la del primer issue importado), nombre, editorial
- Barra de progreso `X/Y números` cuando la serie está enlazada a GCD con `totalIssues`
- Indicador verde "¡Serie completa!" cuando todos los números están en la colección
- Click en tarjeta → abre sheet lateral de completitud

**Vista plana (otros modos de ordenación):**
- Grid de tarjetas con portada, título, número de issue, editorial
- Etiquetas del cómic visibles en cada tarjeta
- Badges de estado activos (un cómic puede tener varios simultáneamente): `Tengo`, `Leído`, `Wishlist`, `Favorito`, `Prestado`
- Badge de aviso `⚠` en tarjetas con portada o sinopsis ausentes

**Búsqueda y filtrado:**
- Barra de búsqueda con debounce 300ms — busca en título, serie y editorial
- Chips de filtro por etiqueta (tags del usuario)
- Filtros de estado: Todos / Tengo / Leído / Wishlist / Favoritos
- Panel de filtros avanzados (desplegable):
  - Editorial (texto, debounce 300ms)
  - Año desde / Año hasta (número, min 1900, max 2099)
  - Badge contador de filtros activos
- Todos los filtros son combinables entre sí

**Ordenación:**
- Serie (por defecto) — activa la vista de series con tarjeta por serie
- Título / Año / Añadido / Puntuación — activan la vista plana

**Completitud de series (sheet lateral):**
- Se abre al hacer click en "Ver completitud" en la tarjeta de serie
- Barra de progreso (X de Y números, % completitud)
- Lista completa de issues: los que tienes (verde "En colección") + los que faltan (botón "Añadir a wishlist")
- Usa `GET /gcd/series/:gcdSeriesId/completion` si la serie está enlazada; si no, `GET /gcd/series-completion?issueId=...`
- Cuando se añade a wishlist se actualiza sin recargar (estado local `addedIds`)

**Gestión:**
- Eliminar cómic de la biblioteca (doble clic: papelera → confirmar)
- Paginación (20 por página) solo en vista plana

### 4. Búsqueda (`/search`)

**Fuentes disponibles:**
- **GCD** (por defecto) — Grand Comics Database local, modo serie
- **Google Books** — búsqueda en Google Books API
- **Open Library** — búsqueda en Open Library API
- **Tebeosfera** (beta) — scraper de la base de datos española
- **Whakoom** (beta) — scraper de la red social de cómics

**GCD — modo serie (por defecto para fuente GCD):**
- Resultados: una card por serie (no por issue) con nombre, editorial, años y número de issues
- Click en una card de serie → sheet lateral `GcdSeriesIssuesSheet`
- Sheet lateral de serie: lista todos los issues con progreso de colección, botón "Añadir" por issue
- Filtros aplicables para GCD: editorial, año (el filtro de creador está oculto en modo serie)
- Al añadir un issue desde la sheet: se importa el comic y se añade como "Tengo" automáticamente

**Fuentes externas (Google Books, Open Library, Tebeosfera, Whakoom):**
- Resultados: grid de tarjetas con portada, título, autor, editorial, año y valoración (si disponible)
- Botón "Añadir" por tarjeta — importa el cómic y lo añade como "Tengo"
- Paginación de 20 en 20

**Añadir manualmente (fuentes externas sin resultados):**
- Aparece cuando la búsqueda en fuente no-GCD no da resultados
- Campos: Título (obligatorio), Issue, Año, Editorial, URL de portada
- Solo disponible en fuentes externas (no en GCD, ya que GCD tiene su propia sheet)

### 5. Ficha de cómic (`/comics/:id`)

**Sección Hero:**
- Portada (o placeholder si no hay)
- Título, número de issue, editorial, año, precio y páginas (desde GCD cuando disponible)
- Banner de aviso (ámbar) cuando falta portada o sinopsis
- Botón de edición (lápiz) → abre EditSheet

**EditSheet — edición de metadatos:**
- Campos: Título (obligatorio), Editorial, Año (1900–2099), Serie, URL de portada, ISBN, Encuadernación (select), Estilo de dibujo, Sinopsis
- Botón Guardar deshabilitado si Título está vacío
- Actualiza inmediatamente la vista y la biblioteca al guardar

**Gestión de etiquetas (inline):**
- Añadir etiqueta escribiendo + Enter; autocompletado desde etiquetas existentes del usuario
- Eliminar etiqueta con × en cada badge

**Estado personal (checkboxes/toggles):**
- `Tengo` / `Leído` / `Wishlist` / `Favorito` — independientes y combinables
- Toggle de préstamo con campo "Prestado a" (texto libre)

**Puntuación:**
- 1–5 estrellas, clic para puntuar; segundo clic en la misma estrella la deselecciona

**Notas:**
- Textarea con autoguardado por debounce (500ms)

**Secciones de información (desde GCD cuando disponible):**
- Sinopsis
- Creadores agrupados por rol (Guion, Dibujo, Tintas, Color, Rótulos, Edición)
- Historias: tipo, páginas, género, personajes, sinopsis, primera línea
- Serie: formato, años, total de números, fechas de publicación, color, dimensiones, papel, encuadernación, formato editorial
- Editorial: nombre, años activa, web oficial
- Publicación: precio, fecha de venta, código de barras, ISBN

**Dónde comprar (visible cuando `isWishlist === true` e `isbn` disponible):**
- Botón copiar ISBN al portapapeles
- Links a Amazon.es, FNAC.es y búsqueda en Google

**Añadir a la biblioteca (si el cómic no está en la colección):**
- Botón "Añadir a biblioteca" que lo añade como "Tengo"

### 6. Colecciones (`/collections`)

- Crear colección con nombre (obligatorio, máx 60 chars) y descripción opcional (máx 200 chars)
- Marcar como pública o privada
- Editar nombre, descripción y visibilidad
- Eliminar colección
- Añadir cómics de la biblioteca a la colección (selector)
- Eliminar cómics de una colección
- Vista expandible de los cómics de cada colección con contador
- Validación con Zod en tiempo real

### 7. Descubrir (`/discover`)

**Recomendaciones IA:**
- Genera 6 recomendaciones personalizadas usando Anthropic Claude (claude-haiku)
- Contexto: series, editoriales, etiquetas y **estilos de dibujo** del usuario
- El dibujante/estilo gráfico tiene peso prioritario en el prompt
- Cada recomendación incluye: título, autor y justificación personalizada

**Resumen de series:**
- Lista de series de la colección ordenadas por número de issues
- Enlace a la biblioteca para ver cada serie

### 8. Ajustes (`/settings`)

**Cuenta:**
- Cambiar nombre de usuario (validación 3–30 chars; detecta usuario ya en uso)

**Apariencia:**
- Cambiar idioma de la interfaz (ES / EN) — persiste en backend y localStorage
- Cambiar tema (Claro / Oscuro / Sistema) via next-themes

**Datos:**
- Exportar biblioteca en CSV con todos los campos (incluido ISBN, encuadernación, estado multi-flag)
- Exportar biblioteca en JSON

**Seguridad:**
- Cambiar contraseña (actual obligatoria, nueva mín 6 chars, confirmación debe coincidir)
- Detecta contraseña actual incorrecta (HTTP 401)

---

## Estado de internacionalización

- Idiomas: **Español** (es) y **English** (en)
- Archivos: `frontend/src/locales/es.json` / `en.json`
- Cobertura: 100% de la UI (todos los textos visibles pasan por i18next)

---

## Validaciones

### Frontend (React Hook Form + Zod)

| Formulario | Campo | Regla |
|---|---|---|
| Login | Email | Formato email válido |
| Login | Contraseña | Requerida (no vacía) |
| Registro | Email | Formato email válido |
| Registro | Username | 3–30 caracteres |
| Registro | Contraseña | Mínimo 6 caracteres |
| Ajustes — Cuenta | Username | 3–30 caracteres |
| Ajustes — Seguridad | Contraseña actual | Requerida |
| Ajustes — Seguridad | Nueva contraseña | Mínimo 6 caracteres |
| Ajustes — Seguridad | Confirmar contraseña | Debe coincidir con nueva |
| Colecciones | Nombre | Requerido, máx 60 chars |
| Colecciones | Descripción | Máx 200 chars |
| EditSheet | Título | Requerido (botón Guardar deshabilitado si vacío) |
| EditSheet | Año | Número, min 1900, max 2099 |
| Añadir manual | Título | Requerido (botón deshabilitado si vacío) |
| Añadir manual | Año | Número, min 1900, max 2099 |
| Búsqueda GCD | Año | Número, min 1900, max año actual |
| Biblioteca — filtro avanzado | Año desde/hasta | Número, min 1900, max 2099 |

### Backend (NestJS class-validator)

| DTO | Campo | Regla |
|---|---|---|
| CreateComicDto | title | `@IsString @IsNotEmpty` |
| CreateComicDto | year | `@IsInt @Min(1900) @Max(2100)` |
| CreateComicDto | coverUrl | `@IsUrl` |
| CreateComicDto | binding | `@IsEnum(BindingFormat)` |
| AddComicDto | comicId | `@IsString` requerido |
| AddComicDto | rating | `@IsInt @Min(1) @Max(5)` |
| UpdateUserComicDto | rating | `@IsInt @Min(1) @Max(5)` |
| Auth DTOs | email | `@IsEmail` |
| Auth DTOs | password | `@MinLength(6)` |

---

## Rutas de la API (backend)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/login` | Login, devuelve JWT |
| GET | `/auth/me` | Perfil del usuario autenticado |
| GET | `/my-library` | Biblioteca con filtros y paginación |
| POST | `/my-library` | Añadir cómic a la biblioteca |
| PATCH | `/my-library/:comicId` | Actualizar estado/puntuación/notas |
| DELETE | `/my-library/:comicId` | Eliminar de la biblioteca |
| GET | `/my-library/stats` | Estadísticas de la colección |
| GET | `/my-library/export` | Exportar en CSV o JSON |
| GET | `/my-library/comic/:comicId` | Estado de un cómic concreto |
| GET | `/comics/:id` | Ficha completa de un cómic |
| POST | `/comics` | Crear cómic manualmente |
| PATCH | `/comics/:id` | Editar metadatos de un cómic |
| GET | `/comics/tags/user` | Etiquetas del usuario |
| POST | `/comics/:id/tags` | Añadir etiqueta |
| DELETE | `/comics/:id/tags/:tagId` | Eliminar etiqueta |
| GET | `/gcd/search` | Búsqueda de issues en GCD |
| GET | `/gcd/series-search` | Búsqueda de series en GCD (1 resultado por serie) |
| GET | `/gcd/detail/:id` | Detalle de un issue GCD |
| POST | `/gcd/import` | Importar issue GCD a la BD local (crea/enlaza Series automáticamente) |
| GET | `/gcd/series-completion` | Completitud de una serie por issueId |
| GET | `/gcd/series/:seriesId/completion` | Completitud de una serie por GCD series ID |
| GET | `/my-library/series-view` | Biblioteca agrupada por serie (Series cards) |
| POST | `/ai/recommend` | Recomendaciones IA personalizadas |
| GET | `/collections` | Listar colecciones del usuario |
| POST | `/collections` | Crear colección |
| PATCH | `/collections/:id` | Editar colección |
| DELETE | `/collections/:id` | Eliminar colección |
| POST | `/collections/:id/comics` | Añadir cómic a colección |
| DELETE | `/collections/:id/comics/:comicId` | Quitar cómic de colección |
| PATCH | `/users/me` | Actualizar perfil (username, language) |
| PATCH | `/users/me/password` | Cambiar contraseña |

---

## Próximos pasos

- Responsive mobile: sidebar colapsable en pantallas pequeñas
- Lector de código de barras (cámara del móvil para buscar por ISBN)
- Importación desde CSV / exportación compatible con Whakoom
- Notificaciones de nuevas publicaciones en series seguidas
- Alertas de precio en wishlist
- App móvil nativa (PWA o Capacitor)
- Compartir colección con enlace privado para familia/amigos
