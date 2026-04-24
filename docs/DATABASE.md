# Database — Koma

El proyecto usa **una única base de datos**: PostgreSQL gestionada con Prisma 7, alojada en Neon.

---

## Jerarquía del modelo de datos

```
Collection (colección temática del usuario)
  └── CollectionSeries (serie dentro de la colección, ej. "Principal", "Edición Deluxe")
        └── UserComic (asignación del cómic a esa serie)
              └── Comic (registro canónico del cómic)

UserComic (biblioteca personal del usuario)
  → flags: collectionStatus, readStatus, saleStatus, loanedTo, rating, notes
  → overrides: título, portada, sinopsis... por usuario
```

- Una `Collection` crea automáticamente una `CollectionSeries` llamada "Principal" (`isDefault: true`).
- Un `Comic` libre (sin serie asignada) tiene `collectionSeriesId = null` — solo aparece en la biblioteca via `UserComic`.
- La deduplicación de cómics se hace por campo `isbn` (único, obligatorio). ISBNdb es la fuente externa.

---

## Modelos

### `users`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String unique | Email de acceso |
| `username` | String unique | Nombre de usuario |
| `password_hash` | String? | Contraseña hasheada con bcrypt (null si solo Google OAuth) |
| `google_id` | String? unique | ID de Google OAuth |
| `avatar_url` | String? | URL de avatar |
| `language` | String | Idioma de interfaz (`"es"` por defecto) |
| `created_at` | DateTime | Fecha de creación |
| `updated_at` | DateTime | Última actualización |

---

### `comics`

Registro canónico e inmutable. Los usuarios no editan este registro directamente — usan los campos `*Override` en `user_comics`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | Título |
| `issue_number` | String? | Número de issue |
| `publisher` | String? | Editorial |
| `year` | Int? | Año de publicación |
| `synopsis` | Text? | Sinopsis |
| `cover_url` | String? | URL de portada |
| `isbn` | String unique | ISBN — obligatorio, clave de deduplicación |
| `binding` | BindingFormat? | Encuadernación (enum) |
| `drawing_style` | String? | Estilo de dibujo |
| `authors` | String? | Autores (texto libre) |
| `scriptwriter` | String? | Guionista |
| `artist` | String? | Dibujante/artista |
| `created_by` | String? | null = importado de ISBNdb; userId = creado manualmente |
| `created_at` | DateTime | — |
| `updated_at` | DateTime | — |

---

### `user_comics`

Tabla pivote Usuario ↔ Cómic. Representa la entrada del cómic en la biblioteca personal del usuario.

El sistema de estados tiene tres grupos **independientes** y **acumulables**:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `collection_status` | CollectionStatus? | Grupo 1: posesión (`IN_COLLECTION`, `WISHLIST`, `LOANED`) |
| `read_status` | ReadStatus? | Grupo 2: lectura (`READ`, `READING`, `TO_READ`) |
| `sale_status` | SaleStatus? | Grupo 3: venta (`FOR_SALE`, `TO_SELL`, `SOLD`) |
| `loaned_to` | String? | Nombre de quien tiene prestado el cómic |
| `rating` | Int? | 1–5, null si no ha puntuado |
| `notes` | Text? | Notas personales |
| `added_at` | DateTime | Fecha de adición a la biblioteca |
| `series_position` | Int? | Posición manual dentro de la serie |
| `collection_series_id` | String? | FK → collection_series (null si cómic libre) |
| `user_id` | String | FK → users |
| `comic_id` | String | FK → comics |

**Overrides por usuario** (toman prioridad sobre el registro canónico `comics` al mostrar datos):

| Campo | Tipo |
|---|---|
| `title_override` | String? |
| `issue_number_override` | String? |
| `publisher_override` | String? |
| `year_override` | Int? |
| `synopsis_override` | Text? |
| `cover_url_override` | String? |
| `binding_override` | BindingFormat? |
| `drawing_style_override` | String? |
| `authors_override` | String? |
| `scriptwriter_override` | String? |
| `artist_override` | String? |

**Nota:** Los overrides solo aplican a usuarios que **no** son el `created_by` del cómic.

**Constraint único:** `(user_id, comic_id)` — un usuario no puede tener el mismo cómic duplicado.

**Regla de exclusión:** `SOLD` (grupo 3) implica `collection_status = null` (el cómic ya no está en posesión del usuario).

---

### `collections`

Colección temática del usuario (ej. "Mi colección de Astérix").

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Nombre |
| `description` | Text? | Descripción |
| `is_public` | Boolean | Visible públicamente (default false) |
| `rating` | Int? | Valoración global de la colección |
| `created_at` | DateTime | — |
| `user_id` | String | FK → users |

---

### `collection_series`

Serie dentro de una Colección (ej. "Principal", "Edición Deluxe", "Arco 1").

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Nombre de la serie |
| `is_default` | Boolean | `true` si es la serie "Principal" creada automáticamente |
| `position` | Int | Orden dentro de la colección (default 0) |
| `total_volumes` | Int? | Número de volúmenes esperados en esta serie |
| `created_at` | DateTime | — |
| `collection_id` | String | FK → collections |

---

### `tags`

Etiquetas para categorizar cómics. Asignadas manualmente o por el agente IA.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String unique | Nombre legible (ej. "línea clara") |
| `slug` | String unique | Versión URL-safe (ej. "linea-clara") |

---

### `comic_tags` *(M:N Comic ↔ Tag)*

| Campo | Tipo |
|---|---|
| `comic_id` | String — FK → comics |
| `tag_id` | String — FK → tags |

**PK compuesta:** `(comic_id, tag_id)`.

---

## Enums

### `BindingFormat`
| Valor | Descripción |
|---|---|
| `CARTONE` | Cartoné (tapa dura con lomo cuadrado) |
| `TAPA_BLANDA` | Tapa blanda |
| `BOLSILLO` | Formato bolsillo |
| `OMNIBUS` | Ómnibus (recopilatorio) |
| `HARDCOVER` | Tapa dura (formato americano) |
| `DIGITAL` | Digital |


### `CollectionStatus` (Grupo 1 — posesión)
| Valor | Descripción |
|---|---|
| `IN_COLLECTION` | Lo poseo físicamente |
| `WISHLIST` | Lo quiero conseguir |
| `LOANED` | Lo tengo prestado a alguien |

### `ReadStatus` (Grupo 2 — lectura)
| Valor | Descripción |
|---|---|
| `READ` | Leído |
| `READING` | Leyendo actualmente |
| `TO_READ` | Pendiente de leer |

### `SaleStatus` (Grupo 3 — venta/mercadillo)
| Valor | Descripción |
|---|---|
| `FOR_SALE` | A la venta |
| `TO_SELL` | Quiero venderlo (en algún momento) |
| `SOLD` | Vendido (implica `collection_status = null`) |

---

## Comandos de base de datos

```bash
# Ver estado de la BD
npx prisma studio

# Aplicar un cambio de schema con historial de migración
# 1. Editar prisma/schema.prisma
# 2. Ejecutar:
npx prisma migrate dev --name descripcion_del_cambio
# 3. Commit tanto schema.prisma como la nueva carpeta en prisma/migrations/

# Regenerar tipos Prisma (sin tocar BD)
npx prisma generate

# Verificar que migraciones y schema están en sync
npx prisma migrate status
```

> **Nota:** Este proyecto usa `prisma migrate dev` con historial de migraciones en `prisma/migrations/`. El baseline del schema actual está en `20260420180931_init`.
>
> **Shadow database:** Neon no soporta creación de shadow databases. Para usar `migrate dev` localmente, configura `SHADOW_DATABASE_URL` en `.env` apuntando a una instancia PostgreSQL local, o usa `prisma migrate diff` + `prisma migrate resolve --applied` para crear migraciones manualmente.
