# Database — Koma

El proyecto usa **dos bases de datos independientes**:

| BD | Motor | Propósito | Acceso |
|---|---|---|---|
| PostgreSQL (Neon) | PostgreSQL | Datos del usuario: cómics, biblioteca, colecciones | Prisma 7 |
| `comics_db` | MySQL | Catálogo GCD (~3.5M issues, solo lectura) | mysql2 pool |

---

## PostgreSQL — Prisma Schema

### `users`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String unique | Email de acceso |
| `username` | String unique | Nombre de usuario |
| `password_hash` | String | Contraseña hasheada con bcrypt |
| `created_at` | DateTime | Fecha de creación |
| `updated_at` | DateTime | Última actualización |

---

### `comics`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | Nombre de la serie |
| `issue_number` | String? | Número del cómic |
| `publisher` | String? | Editorial |
| `year` | Int? | Año de publicación |
| `synopsis` | Text? | Sinopsis |
| `cover_url` | String? | URL de portada |
| `external_id` | String? | ID externo (p.ej. `"gcd-123456"`) |
| `external_api` | String? | Origen (`"gcd"` \| `"manual"`) |
| `metadata` | Json? | Datos adicionales de la fuente externa |
| `created_at` | DateTime | — |
| `updated_at` | DateTime | — |

---

### `user_comics` *(tabla pivote Usuario ↔ Cómic)*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `user_id` | String | FK → users |
| `comic_id` | String | FK → comics |
| `status` | Enum | `OWNED` \| `READ` \| `WISHLIST` \| `FAVORITE` |
| `rating` | Int? | 1–5, null si no puntuado |
| `notes` | Text? | Notas personales |
| `added_at` | DateTime | Fecha de adición |

**Constraint único:** `(user_id, comic_id)` — un usuario no puede tener el mismo cómic duplicado.

---

### `collections`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Nombre de la colección |
| `description` | Text? | Descripción |
| `is_public` | Boolean | Si es visible públicamente (default false) |
| `user_id` | String | FK → users |
| `created_at` | DateTime | — |

---

### `collection_comics` *(tabla pivote Collection ↔ Comic)*

| Campo | Tipo | Descripción |
|---|---|---|
| `collection_id` | String | FK → collections |
| `comic_id` | String | FK → comics |
| `added_at` | DateTime | Fecha de adición |

**PK compuesta:** `(collection_id, comic_id)`.

---

### `tags`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String unique | Nombre legible (ej. "superhéroe") |
| `slug` | String unique | Versión URL-safe (ej. "superheroe") |

---

### `comic_tags` *(tabla pivote Comic ↔ Tag)*

| Campo | Tipo | Descripción |
|---|---|---|
| `comic_id` | String | FK → comics |
| `tag_id` | String | FK → tags |

**PK compuesta:** `(comic_id, tag_id)`.

---

## MySQL — GCD (`comics_db`)

Base de datos de solo lectura. El dump oficial de [Grand Comics Database](https://www.comics.org/download/) contiene ~75 tablas. Koma solo usa las siguientes:

### Tablas usadas

#### `gcd_issue`
Un número concreto de una serie.

Columnas clave:
| Columna | Descripción |
|---|---|
| `id` | PK |
| `series_id` | FK → gcd_series |
| `number` | Número del ejemplar ("404", "Annual 1") |
| `key_date` | Fecha en formato `YYYY-MM-DD` (extraer año con `LIKE '1986%'`) |
| `page_count` | Total de páginas (decimal) |
| `price` | Precio de portada (texto) |
| `on_sale_date` | Fecha de venta |
| `barcode` | Código de barras |
| `isbn` | ISBN (crudo) |
| `valid_isbn` | ISBN normalizado, usado para portadas via Open Library |
| `deleted` | 0 = activo, 1 = eliminado |

---

#### `gcd_series`
Una serie de cómics.

Columnas clave:
| Columna | Descripción |
|---|---|
| `id` | PK |
| `name` | Nombre de la serie |
| `publisher_id` | FK → gcd_publisher |
| `year_began` | Año de inicio |
| `year_ended` | Año de fin (null si sigue activa) |
| `issue_count` | Total de números |
| `format` | Formato (ej. "comic") |
| `color` | Información de color |
| `dimensions` | Dimensiones físicas |
| `paper_stock` | Tipo de papel |
| `binding` | Tipo de encuadernación |
| `publishing_format` | Formato de publicación |
| `publication_dates` | Fechas de publicación (texto libre) |

---

#### `gcd_publisher`
Editorial.

| Columna | Descripción |
|---|---|
| `id` | PK |
| `name` | Nombre de la editorial |
| `year_began` | Año de fundación |
| `year_ended` | Año de cierre (null si sigue activa) |
| `url` | Web oficial |

---

#### `gcd_story`
Una historia/relato dentro de un número. Un número puede tener varias historias.

Columnas clave:
| Columna | Descripción |
|---|---|
| `id` | PK |
| `issue_id` | FK → gcd_issue |
| `sequence_number` | Orden dentro del número (**NO** usar `sequence`) |
| `title` | Título de la historia |
| `type_id` | FK → gcd_story_type |
| `page_count` | Páginas de esta historia |
| `synopsis` | Sinopsis |
| `genre` | Género (texto libre) |
| `characters` | Personajes (texto libre, separados por `;`) |
| `feature` | Personaje/feature principal |
| `first_line` | Primera línea de diálogo |
| `script` | Guionista(s) — texto libre, separado por comas |
| `pencils` | Dibujante(s) — texto libre |
| `inks` | Entintador(es) — texto libre (**NO** usar `inking`) |
| `colors` | Colorista(s) — texto libre (**NO** usar `coloring`) |
| `letters` | Rotulador(es) — texto libre (**NO** usar `lettering`) |
| `editing` | Editor(es) — texto libre |
| `deleted` | 0 = activo |

**Nota sobre créditos:** Los créditos están como texto libre separado por comas/punto y coma. El valor `"?"` significa autor desconocido y debe filtrarse. No existe tabla `gcd_credit` en el dump.

---

#### `gcd_story_type`
Tipos de historia (ej. "Comic Story", "Text Story", "Cover", "Advertisement").

| Columna | Descripción |
|---|---|
| `id` | PK |
| `name` | Nombre del tipo |

---

#### `gcd_creator`
Creadores (para búsqueda por creador vía `gcd_story_credit`).

| Columna | Descripción |
|---|---|
| `id` | PK |
| `gcd_official_name` | Nombre oficial |

---

### Joins habituales

```sql
-- Búsqueda de issues (base)
SELECT i.id, s.name AS series_name, i.number, i.key_date, p.name AS publisher_name
FROM   gcd_issue     i
JOIN   gcd_series    s ON s.id = i.series_id
JOIN   gcd_publisher p ON p.id = s.publisher_id
WHERE  i.deleted = 0 AND s.deleted = 0

-- Filtrar por año (extraer de key_date)
AND i.key_date LIKE '1986%'

-- Historias de un número, ordenadas
SELECT title, sequence_number, page_count, synopsis, genre, characters
FROM   gcd_story
WHERE  issue_id = ? AND deleted = 0
ORDER  BY sequence_number

-- Tipo de historia
LEFT JOIN gcd_story_type st ON st.id = s.type_id

-- Datos de serie y editorial para detalle
JOIN gcd_series    s ON s.id = i.series_id
JOIN gcd_publisher p ON p.id = s.publisher_id
WHERE i.id = ?
```

---

### Tablas que NO existen en el dump

- `gcd_credit` — **NO existe**. Usar campos de texto de `gcd_story` para créditos.
- `gcd_cover` — **NO existe** en dumps recientes.
- `gcd_credit_type` — referenciada por `gcd_story_credit.credit_type_id` pero no incluida.
