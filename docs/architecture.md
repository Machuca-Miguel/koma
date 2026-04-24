# Arquitectura — Koma

## Estructura de directorios

```
Koma/
├── backend/                    # NestJS 11 API
│   ├── prisma/
│   │   └── schema.prisma       # Modelos PostgreSQL (única BD)
│   └── src/
│       ├── auth/               # JWT + Google OAuth, guards, register/login
│       ├── ai/                 # Recomendaciones IA (Anthropic Claude Haiku)
│       ├── collection-series/  # Series dentro de colecciones
│       ├── collections/        # Colecciones temáticas del usuario
│       ├── comics/             # CRUD cómics + tags
│       ├── isbndb/             # Proxy a API ISBNdb (búsqueda/importación)
│       ├── prisma/             # PrismaService singleton
│       ├── user-comics/        # Biblioteca personal (UserComic)
│       └── users/              # Perfil de usuario
│
└── frontend/                   # React 19 + Vite SPA
    └── src/
        ├── api/                # Clientes HTTP por recurso (axios)
        ├── components/
        │   ├── features/       # Componentes de dominio (sheets, dialogs)
        │   ├── layout/         # DashboardLayout, sidebar
        │   ├── theme/          # ThemeProvider, ThemeToggle
        │   └── ui/             # shadcn/ui: Button, Card, Badge…
        ├── hooks/              # Custom hooks (useBreadcrumbs, etc.)
        ├── locales/            # Traducciones i18n (es.json, en.json)
        ├── pages/              # Una página por ruta
        ├── router/             # React Router v7
        └── types/              # Interfaces TypeScript compartidas
```

---

## Backend — módulos NestJS

```
AppModule
├── AuthModule          → POST /auth/register, /login, GET /auth/me, /google
├── ComicsModule        → GET/POST/PATCH/DELETE /comics, /comics/:id/tags
├── UserComicsModule    → GET/POST/PATCH/DELETE /my-library (+ series-view, export, import)
├── CollectionsModule   → GET/POST/PATCH/DELETE /collections
├── CollectionSeriesModule → GET/POST/PATCH/DELETE /collections/:id/series
├── IsbndbModule        → GET /isbndb/books/search, /isbndb/book/:isbn, POST /isbndb/import…
├── AiModule            → POST /ai/recommend
└── UsersModule         → PATCH /users/me, /users/me/password
```

Cada módulo tiene: `controller`, `service`, `dto/` y su módulo declarativo.

---

## Base de datos

Una única base de datos: **PostgreSQL** en Neon, gestionada con Prisma 7.

| BD | Tecnología | Propósito | ORM |
|---|---|---|---|
| `neon` | PostgreSQL | Usuarios, biblioteca, colecciones, cómics | Prisma 7 |

Para metadatos externos se usa la **API de ISBNdb** (llamadas HTTP en tiempo real desde el backend). No hay base de datos local de catálogo.

---

## Frontend — páginas y rutas

| Ruta | Página | Descripción |
|---|---|---|
| `/login` | LoginPage | Formulario de acceso + Google OAuth |
| `/register` | RegisterPage | Formulario de registro |
| `/dashboard` | DashboardPage | Stats de la biblioteca y accesos rápidos |
| `/library` | LibraryPage | Biblioteca personal con filtros (vista series por defecto) |
| `/library/series/:id` | LibrarySeriesPage | Detalle de una serie en la biblioteca |
| `/comics/:id` | ComicDetailPage | Vista detallada y gestión de un cómic |
| `/search` | SearchPage | Búsqueda en ISBNdb + añadir manualmente |
| `/collections` | CollectionsPage | Gestión de colecciones |
| `/collections/:id` | CollectionDetailPage | Detalle de colección con sus series y cómics |
| `/series/:id` | SeriesDetailPage | Detalle de una serie dentro de una colección |
| `/discover` | DiscoverPage | Recomendaciones IA + resumen de series |
| `/settings` | SettingsPage | Cuenta, idioma, tema, seguridad, exportar datos |

Las rutas bajo `/` están protegidas por `ProtectedRoute` (verifica JWT en localStorage). Las rutas `/login` y `/register` usan `PublicRoute` que redirige si ya hay sesión.

---

## Modelo de datos (jerarquía)

```
Collection (id, name, description, isPublic, rating)
  └── CollectionSeries / "Serie" (id, name, isDefault, position, totalVolumes, collectionId)
        └── UserComic (asignación del cómic a esa serie, con estados y overrides)
              └── Comic (id, title, issueNumber, publisher, year, isbn, binding, ...)

UserComic (biblioteca personal del usuario)
  → collectionStatus: IN_COLLECTION | WISHLIST | LOANED
  → readStatus: READ | READING | TO_READ
  → saleStatus: FOR_SALE | TO_SELL | SOLD
  → overrides: campos que el usuario puede personalizar sin afectar el registro canónico
```

- Cada `Collection` crea automáticamente una `CollectionSeries` "Principal" (`isDefault: true`).
- Un `Comic` libre tiene `collectionSeriesId = null` — solo en biblioteca via `UserComic`.
- `isbn` es el campo único de deduplicación. ISBNdb es la fuente externa de metadatos.

---

## Flujo de datos principal

```
Usuario busca en /search
        ↓
GET /isbndb/books/search?q=...  (API ISBNdb externa)
        ↓
Resultados: lista de libros con ISBN, portada, autor, editorial…
        ↓
Usuario pulsa "Añadir a biblioteca"
        ↓
POST /isbndb/import { book }   →  crea Comic en PostgreSQL (si no existe por isbn)
        ↓
POST /my-library { comicId, collectionStatus: "IN_COLLECTION" }  →  crea UserComic
        ↓
Aparece en /library
        ↓
Usuario pulsa la portada  →  navega a /comics/:id
        ↓
GET /comics/:id            →  datos del Comic (PostgreSQL)
GET /my-library/comic/:id  →  estado del usuario (collectionStatus, rating, notas…)
```

---

## Autenticación

- **Email/password**: `POST /auth/register` y `/auth/login` → bcrypt + JWT firmado con `JWT_SECRET`.
- **Google OAuth**: `GET /auth/google` → redirect a Google → callback en `/auth/google/callback` → devuelve JWT.
- Todas las rutas protegidas usan `JwtAuthGuard` que extrae `userId` del token e inyecta en `req.user`.
- El frontend almacena el token en localStorage y lo adjunta en cada request via interceptor de Axios. Un 401 limpia la sesión y redirige a `/login`.

---

## Internacionalización

- Idiomas: **Español** (`es`, por defecto) y **English** (`en`).
- Archivos: `frontend/src/locales/es.json` y `en.json`.
- La preferencia se guarda en el servidor (`User.language`) y en localStorage.

---

## Tests

| Nivel | Framework | Comando | Cobertura |
|---|---|---|---|
| Backend | Jest | `cd backend && npm test` | ~50 tests (1 fallo conocido en auth) |
| Frontend | Vitest | `cd frontend && npm test` | ~25 tests |
