# Arquitectura — Koma

## Estructura de directorios

```
comicvault/
├── backend/                    # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos PostgreSQL
│   │   └── migrations/         # Historial de migraciones Prisma
│   └── src/
│       ├── auth/               # JWT, guards, register/login
│       ├── comics/             # CRUD cómics en PostgreSQL
│       ├── collections/        # Colecciones temáticas del usuario
│       ├── gcd/                # Acceso a la BD GCD local (MySQL)
│       ├── prisma/             # PrismaService singleton
│       ├── user-comics/        # Biblioteca personal (UserComic)
│       └── users/              # Modelo de usuario
│
└── frontend/                   # React + Vite SPA
    └── src/
        ├── api/                # Clientes HTTP por recurso (axios)
        ├── components/
        │   ├── layout/         # DashboardLayout, sidebar
        │   ├── theme/          # ThemeProvider, ThemeToggle
        │   └── ui/             # shadcn/ui: Button, Card, Badge…
        ├── pages/              # Una página por ruta
        ├── router/             # React Router v7
        └── types/              # Interfaces TypeScript compartidas
```

---

## Backend — módulos NestJS

```
AppModule
├── AuthModule          → POST /auth/register, /login, /me
├── ComicsModule        → GET/POST/PATCH/DELETE /comics
├── UserComicsModule    → GET/POST/PATCH/DELETE /my-library
├── CollectionsModule   → GET/POST/PATCH/DELETE /collections
└── GcdModule           → GET /gcd/search, /gcd/detail/:id, POST /gcd/import
```

Cada módulo tiene: `controller`, `service`, `dto/`, y su módulo declarativo.
`GcdModule` además tiene `GcdDatabaseService` — pool MySQL2 para GCD.

---

## Frontend — páginas y rutas

| Ruta | Página | Descripción |
|---|---|---|
| `/login` | AuthPage (modo login) | Formulario de acceso |
| `/register` | AuthPage (modo register) | Formulario de registro |
| `/dashboard` | DashboardPage | Stats de la biblioteca |
| `/library` | LibraryPage | Biblioteca personal con filtros |
| `/comics/:id` | ComicDetailPage | Vista detallada de un cómic |
| `/search` | SearchPage | Búsqueda en GCD |
| `/collections` | CollectionsPage | Gestión de colecciones |

Las rutas dentro del dashboard están protegidas por `ProtectedRoute` (verifica JWT en localStorage). Las rutas `/login` y `/register` tienen `PublicRoute` que redirige si ya hay sesión.

---

## Flujo de datos principal

```
Usuario busca en /search
        ↓
GET /gcd/search?q=...  (MySQL GCD local)
        ↓
Resultados: lista de GcdComic (externalId = "gcd-XXXXX")
        ↓
Usuario pulsa "Añadir a biblioteca"
        ↓
POST /gcd/import { externalId }   →  crea Comic en PostgreSQL
        ↓
POST /my-library { comicId, status }  →  crea UserComic en PostgreSQL
        ↓
Aparece en /library
        ↓
Usuario pulsa la portada  →  navega a /comics/:id
        ↓
GET /comics/:id          →  datos Prisma (Comic)
GET /gcd/detail/:id      →  datos enriquecidos GCD (creadores, historias, serie)
GET /my-library/comic/:id →  estado del usuario (status, rating, notas)
```

---

## Dos bases de datos

| BD | Tecnología | Propósito | ORM/Driver |
|---|---|---|---|
| `neon` | PostgreSQL | Usuarios, biblioteca, colecciones | Prisma 7 |
| `comics_db` | MySQL | Catálogo GCD (~3.5M issues) | mysql2 pool |

La BD GCD es **solo lectura**. Nunca se escribe en ella. El módulo `GcdDatabaseService` expone un único método `.query()` sobre un pool de 5 conexiones.

Si `GCD_DB_HOST` no está configurada en `.env`, el módulo GCD se marca como no disponible y devuelve resultados vacíos sin lanzar error.

---

## Autenticación

- Registro: `POST /auth/register` → hashea contraseña con bcrypt, crea usuario en PostgreSQL, devuelve JWT.
- Login: `POST /auth/login` → valida credenciales con passport-local, devuelve JWT firmado con `JWT_SECRET`.
- Todas las rutas protegidas usan `JwtAuthGuard` que extrae `userId` del token y lo inyecta en `req.user`.
- El frontend almacena el token en localStorage y lo envía en cada request vía interceptor de Axios (`Authorization: Bearer <token>`). Si recibe 401, limpia sesión y redirige a `/login`.
