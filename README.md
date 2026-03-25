# Koma

Aplicación personal de gestión de colección de cómics. Permite buscar en la base de datos GCD (Grand Comics Database) local, importar cómics a tu biblioteca personal, organizarlos en colecciones y llevar un registro de tu estado de lectura, puntuación y notas.

**Objetivo:** portfolio personal + uso propio. Sin SEO, sin multi-tenant.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 11, TypeScript 5, Prisma 7 |
| Base de datos (usuario) | PostgreSQL (Neon) vía Prisma |
| Base de datos (catálogo) | MySQL — dump local de Grand Comics Database |
| Autenticación | JWT (passport-jwt + bcrypt) |
| API docs | Swagger en `/api/docs` |
| Frontend | React 19 + Vite 8, React Router v7 |
| Estado/Fetching | TanStack Query v5 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Formularios | React Hook Form + Zod |
| Tests backend | Jest |
| Tests frontend | Vitest + Testing Library |

---

## Requisitos previos

- Node.js 20+
- PostgreSQL (o cuenta en [Neon](https://neon.tech))
- MySQL local con el dump de GCD importado en la base de datos `comics_db`
- Archivo `.env` en `backend/` con las variables de entorno

---

## Variables de entorno

Crea `backend/.env` con:

```env
# PostgreSQL (Neon)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT
JWT_SECRET="tu-secreto-jwt"

# GCD MySQL local
GCD_DB_HOST=localhost
GCD_DB_PORT=3306
GCD_DB_USER=root
GCD_DB_PASSWORD=tu-password
GCD_DB_NAME=comics_db
```

---

## Instalación y arranque

```bash
# 1. Backend
cd backend
npm install
npx prisma migrate deploy   # aplica migraciones en PostgreSQL
npm run start:dev            # http://localhost:3000

# 2. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

La documentación Swagger estará disponible en `http://localhost:3000/api/docs`.

---

## Comandos útiles

```bash
# Backend
npm run start:dev        # modo desarrollo con hot-reload
npm test                 # tests unitarios
npm run test:cov         # cobertura

# Frontend
npm run dev              # modo desarrollo
npm test                 # tests con Vitest
npm run build            # build de producción
```

---

## Documentación

- [Arquitectura](docs/architecture.md) — estructura del proyecto y flujo de datos
- [Features](docs/features.md) — funcionalidades implementadas y futuras
- [API Schema](docs/API_SCHEMA.md) — endpoints y contratos
- [Base de datos](docs/DATABASE.md) — esquemas PostgreSQL y GCD MySQL

---

## Repositorio

[https://github.com/Machuca-Miguel/comicvault](https://github.com/Machuca-Miguel/comicvault)
