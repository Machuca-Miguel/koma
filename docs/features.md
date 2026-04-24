# Features — Koma

> Actualizado: 2026-04-20 · Stack: NestJS 11 + Prisma 7 + PostgreSQL (Neon) + React 19 + Vite + TanStack Query + shadcn/ui + Tailwind v4

---

## Flujo general de la aplicación

```
/login o /register
       │
       ▼ (JWT guardado en localStorage)
  /dashboard  ←──── acceso rápido a biblioteca y búsqueda
       │
       ├── /library        → gestión y consulta de la colección personal
       ├── /search         → búsqueda en ISBNdb e importación
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
- Tarjetas de estadísticas: `IN_COLLECTION`, `WISHLIST`, `READ`, `LOANED`
- Valoración media de los cómics puntuados (con contador de valorados)
- Accesos rápidos: "Mi Biblioteca" y "Buscar cómics"

### 3. Biblioteca (`/library`)

**Vista de series (por defecto cuando `sortBy=series_asc`):**
- Una tarjeta por serie con: portada (la del primer issue importado), nombre, editorial
- Barra de progreso `X/Y números` cuando la serie tiene `totalVolumes` configurado
- Indicador verde "¡Serie completa!" cuando todos los números están en la colección
- Click en tarjeta → navega a `/library/series/:id`

**Vista plana (otros modos de ordenación):**
- Grid de tarjetas con portada, título, número de issue, editorial
- Etiquetas del cómic visibles en cada tarjeta
- Badges de estado activos (un cómic puede tener varios simultáneamente): `Tengo`, `Leído`, `Wishlist`, `Favorito`, `Prestado`
- Badge de aviso `⚠` en tarjetas con portada o sinopsis ausentes

**Búsqueda y filtrado:**
- Barra de búsqueda con debounce 300ms — busca en título, serie y editorial
- Chips de filtro por etiqueta (tags del usuario)
- Filtros de estado: Todos / IN_COLLECTION / WISHLIST / READ / LOANED / y resto de valores de los tres grupos
- Panel de filtros avanzados (desplegable):
  - Editorial (texto, debounce 300ms)
  - Año desde / Año hasta (número, min 1900, max 2099)
  - Badge contador de filtros activos
- Todos los filtros son combinables entre sí

**Ordenación:**
- Serie (por defecto) — activa la vista de series con tarjeta por serie
- Título / Año / Añadido / Puntuación — activan la vista plana

**Detalle de serie (`/library/series/:id`):**
- Barra de progreso (X de Y números, % completitud) cuando `totalVolumes` está configurado
- Lista de cómics de la serie con su estado en la biblioteca
- Reordenación manual de posición dentro de la serie

**Gestión:**
- Eliminar cómic de la biblioteca (doble clic: papelera → confirmar)
- Paginación (20 por página) solo en vista plana

### 4. Búsqueda (`/search`)

**Fuente principal:** ISBNdb — base de datos global de libros y cómics con ISBN.

**Búsqueda por texto:**
- Resultados: grid de tarjetas con portada, título, autor, editorial, año e ISBN
- Botón "Añadir" por tarjeta — importa el cómic via `POST /isbndb/import` y lo añade como `IN_COLLECTION`
- Paginación de 20 en 20

**Búsqueda por ISBN:**
- Campo dedicado para búsqueda exacta por ISBN-10 o ISBN-13
- `POST /my-library/add-by-isbn` — busca en ISBNdb, crea el cómic si no existe, y lo añade a la biblioteca en un solo paso

**Añadir manualmente (sin resultados):**
- Disponible cuando la búsqueda no da resultados
- Campos: Título (obligatorio), Issue, Año, Editorial, URL de portada, ISBN
- Crea el cómic directamente en la BD local sin pasar por ISBNdb

### 5. Ficha de cómic (`/comics/:id`)

**Sección Hero:**
- Portada (o placeholder si no hay)
- Título, número de issue, editorial, año, ISBN, encuadernación, estilo de dibujo
- Banner de aviso (ámbar) cuando falta portada o sinopsis
- Botón de edición (lápiz) → abre EditSheet

**EditSheet — edición de metadatos:**
- Campos: Título (obligatorio), Editorial, Año (1900–2099), Serie, URL de portada, ISBN, Encuadernación (select), Estilo de dibujo, Sinopsis
- Botón Guardar deshabilitado si Título está vacío
- Actualiza inmediatamente la vista y la biblioteca al guardar

**Gestión de etiquetas (inline):**
- Añadir etiqueta escribiendo + Enter; autocompletado desde etiquetas existentes del usuario
- Eliminar etiqueta con × en cada badge

**Estado personal (tripartito, independiente):**
- Grupo 1 — Posesión: `IN_COLLECTION` / `WISHLIST` / `LOANED`
- Grupo 2 — Lectura: `READ` / `READING` / `TO_READ`
- Grupo 3 — Venta: `FOR_SALE` / `TO_SELL` / `SOLD`
- Campo `loanedTo` activo cuando `collectionStatus = LOANED`

**Puntuación:**
- 1–5 estrellas, clic para puntuar; segundo clic en la misma estrella la deselecciona

**Notas:**
- Textarea con autoguardado por debounce (500ms)

**Secciones de información:**
- Sinopsis
- Autores: guionista, artista, autores generales
- Publicación: año, editorial, ISBN, encuadernación, estilo de dibujo

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
| Búsqueda ISBNdb | — | Sin validación extra (filtros de texto libre) |
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
| GET | `/auth/google` | Inicia flujo Google OAuth |
| GET | `/my-library` | Biblioteca con filtros y paginación |
| GET | `/my-library/series-view` | Biblioteca agrupada por serie |
| GET | `/my-library/series/:id` | Detalle de una serie en la biblioteca |
| PATCH | `/my-library/series/:id/reorder` | Reordenar cómics de una serie |
| GET | `/my-library/comic/:comicId` | Estado de un cómic concreto |
| GET | `/my-library/stats` | Estadísticas de la colección |
| GET | `/my-library/export` | Exportar en CSV o JSON |
| POST | `/my-library` | Añadir cómic a la biblioteca |
| POST | `/my-library/add-by-isbn` | Buscar por ISBN en ISBNdb y añadir a biblioteca |
| POST | `/my-library/import` | Importar biblioteca desde CSV |
| PATCH | `/my-library/:comicId` | Actualizar estado/puntuación/notas/overrides |
| DELETE | `/my-library/:comicId` | Eliminar de la biblioteca |
| DELETE | `/my-library/bulk` | Eliminar varios cómics a la vez |
| GET | `/comics` | Listar/buscar cómics en la BD local |
| GET | `/comics/tags/user` | Etiquetas del usuario |
| GET | `/comics/:id` | Ficha completa de un cómic |
| GET | `/comics/:id/collections` | Colecciones donde el usuario tiene este cómic |
| POST | `/comics` | Crear cómic manualmente |
| PATCH | `/comics/:id` | Editar metadatos de un cómic |
| POST | `/comics/:id/tags` | Añadir etiqueta |
| DELETE | `/comics/:id/tags/:tagId` | Eliminar etiqueta |
| GET | `/isbndb/books/search` | Buscar libros en ISBNdb |
| GET | `/isbndb/book/:isbn` | Obtener libro por ISBN |
| POST | `/isbndb/import` | Importar libro ISBNdb como cómic en BD local |
| POST | `/ai/recommend` | Recomendaciones IA personalizadas |
| GET | `/collections` | Listar colecciones del usuario |
| POST | `/collections` | Crear colección |
| PATCH | `/collections/:id` | Editar colección |
| DELETE | `/collections/:id` | Eliminar colección |
| GET | `/collections/:id/comics` | Listar cómics de una colección |
| POST | `/collections/:id/comics` | Añadir cómic a colección |
| DELETE | `/collections/:id/comics/:comicId` | Quitar cómic de colección |
| GET | `/collections/:id/series` | Listar series de una colección |
| POST | `/collections/:id/series` | Crear serie en una colección |
| PATCH | `/collections/:id/series/:seriesId` | Editar serie |
| DELETE | `/collections/:id/series/:seriesId` | Eliminar serie |
| PATCH | `/users/me` | Actualizar perfil (username, language) |
| PATCH | `/users/me/password` | Cambiar contraseña |

---

## Próximos pasos

- Responsive mobile: sidebar colapsable en pantallas pequeñas
- Lector de código de barras (cámara del móvil para buscar por ISBN)
- Importación desde CSV / exportación compatible con Whakoom
- Notificaciones de nuevas publicaciones en series seguidas
- App móvil nativa (PWA o Capacitor)
- Compartir colección con enlace privado para familia/amigos
