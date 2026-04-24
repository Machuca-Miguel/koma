# API Schema — Koma

Base URL: `http://localhost:3000`
Swagger interactivo: `http://localhost:3000/api/docs`

Todas las rutas excepto `/auth/register`, `/auth/login` y `/auth/google` requieren:
```
Authorization: Bearer <JWT>
```

---

## Auth — `/auth`

### `POST /auth/register`
Registra un nuevo usuario.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "miguel",
  "password": "secreto123"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": { "id": "cuid", "email": "...", "username": "miguel" }
}
```

---

### `POST /auth/login`
Inicia sesión.

**Body:**
```json
{ "email": "user@example.com", "password": "secreto123" }
```

**Response 200:** igual que register.

---

### `GET /auth/me` 🔒
Devuelve el perfil del usuario autenticado.

**Response 200:**
```json
{ "id": "cuid", "email": "...", "username": "miguel", "language": "es" }
```

---

### `GET /auth/google`
Inicia el flujo OAuth2 con Google. Redirige al consentimiento de Google.

### `GET /auth/google/callback`
Callback de Google OAuth. Redirige al frontend con `?token=<JWT>`.

---

## Comics — `/comics` 🔒

Cómics registrados en la BD local (PostgreSQL).

### `GET /comics`
Lista y busca cómics.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `search` | string | Busca en título y editorial |
| `publisher` | string | Filtro exacto por editorial |
| `page` | number | Página (default 1) |
| `limit` | number | Elementos por página (default 20) |

**Response 200:**
```json
{
  "data": [{ "id": "...", "title": "Batman", "issueNumber": "1", "isbn": "978-..." }],
  "total": 42, "page": 1, "limit": 20, "totalPages": 3
}
```

---

### `GET /comics/tags/user`
Obtiene todas las etiquetas (tags) del usuario autenticado.

**Response 200:** array de `{ id, name, slug }`.

---

### `GET /comics/:id`
Obtiene un cómic con sus tags.

**Response 200:**
```json
{
  "id": "cuid",
  "title": "Watchmen",
  "issueNumber": "1",
  "publisher": "DC Comics",
  "year": 1986,
  "synopsis": "...",
  "coverUrl": "https://...",
  "isbn": "978-1-4012-0841-4",
  "binding": "CARTONE",
  "drawingStyle": "Realista",
  "authors": "Alan Moore",
  "scriptwriter": "Alan Moore",
  "artist": "Dave Gibbons",
  "createdBy": null,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z",
  "tags": [{ "tag": { "id": "...", "name": "superhéroe", "slug": "superheroe" } }]
}
```

---

### `GET /comics/:id/collections`
Obtiene las colecciones en las que el usuario tiene asignado este cómic.

---

### `POST /comics`
Crea un cómic manualmente. El campo `isbn` es obligatorio.

**Body:**
```json
{
  "title": "Watchmen",
  "issueNumber": "1",
  "publisher": "DC Comics",
  "year": 1986,
  "synopsis": "...",
  "coverUrl": "https://...",
  "isbn": "978-1-4012-0841-4",
  "binding": "CARTONE",
  "drawingStyle": "Realista",
  "authors": "Alan Moore",
  "scriptwriter": "Alan Moore",
  "artist": "Dave Gibbons"
}
```

---

### `PATCH /comics/:id`
Actualiza campos de un cómic (todos opcionales).

---

### `DELETE /comics/:id`
Elimina un cómic.

---

### `POST /comics/:id/tags`
Añade una etiqueta a un cómic. Crea la etiqueta si no existe.

**Body:** `{ "name": "línea clara" }`

---

### `DELETE /comics/:id/tags/:tagId`
Elimina una etiqueta de un cómic.

---

## Biblioteca personal — `/my-library` 🔒

Gestión de la colección personal del usuario (tabla `user_comics`).

### `GET /my-library`
Obtiene la biblioteca del usuario con filtros y paginación.

**Query params:**
| Param | Tipo | Valores |
|---|---|---|
| `status` | string | `IN_COLLECTION` \| `WISHLIST` \| `LOANED` \| `READ` \| `READING` \| `TO_READ` \| `FOR_SALE` \| `TO_SELL` \| `SOLD` \| `ALL` |
| `sortBy` | string | `series_asc` \| `title_asc` \| `year_asc` \| `added_desc` \| `rating_desc` |
| `q` | string | Búsqueda por texto |
| `searchBy` | string | `title` \| `authors` \| `scriptwriter` \| `artist` \| `publisher` |
| `tag` | string | Filtrar por slug de etiqueta |
| `publisher` | string | Filtrar por editorial |
| `yearFrom` | number | Año de publicación desde |
| `yearTo` | number | Año de publicación hasta |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response 200:**
```json
{
  "data": [{
    "id": "...",
    "collectionStatus": "IN_COLLECTION",
    "readStatus": "READ",
    "saleStatus": null,
    "rating": 5,
    "notes": "Obra maestra",
    "addedAt": "2026-01-01T00:00:00Z",
    "collectionSeriesId": "...",
    "comic": { "id": "...", "title": "Watchmen", "isbn": "978-...", ... }
  }],
  "total": 10, "page": 1, "limit": 20, "totalPages": 1
}
```

---

### `GET /my-library/series-view`
Vista de la biblioteca agrupada por serie.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `status` | string | mismo enum que `/my-library` |
| `q` | string | Búsqueda por texto |

**Response 200:** array de `UserSeriesSummary`:
```json
[{
  "collectionSeriesId": "...",
  "seriesName": "Astérix",
  "collectionId": "...",
  "collectionName": "Mi colección",
  "isDefault": true,
  "coverUrl": "https://...",
  "ownedCount": 12,
  "comicCount": 12,
  "comics": [{ ... }]
}]
```

---

### `GET /my-library/series/:id`
Detalle de una serie en la biblioteca del usuario.

---

### `PATCH /my-library/series/:id/reorder`
Reordena los cómics de una serie.

**Body:** `{ "positions": [{ "comicId": "...", "position": 0 }] }`

---

### `GET /my-library/comic/:comicId`
Obtiene la entrada de biblioteca para un cómic específico. Devuelve `null` si no está en la biblioteca.

---

### `GET /my-library/stats`
Estadísticas de la biblioteca.

**Response 200:**
```json
{
  "byCollectionStatus": { "IN_COLLECTION": 12, "WISHLIST": 3, "LOANED": 1 },
  "byReadStatus": { "READ": 8, "READING": 2, "TO_READ": 5 },
  "bySaleStatus": { "FOR_SALE": 1, "TO_SELL": 0, "SOLD": 0 },
  "totalRated": 10,
  "averageRating": 4.2
}
```

---

### `GET /my-library/export`
Exporta la biblioteca como CSV o JSON.

**Query params:** `format=csv|json` (default `json`)

Descarga el archivo `koma-library.csv` o `koma-library.json`.

---

### `POST /my-library`
Añade un cómic a la biblioteca.

**Body:**
```json
{
  "comicId": "cuid-del-comic",
  "collectionStatus": "IN_COLLECTION",
  "readStatus": "READ",
  "rating": 5,
  "notes": "Mi favorito",
  "collectionSeriesId": "cuid-de-serie"
}
```

---

### `POST /my-library/add-by-isbn`
Busca un cómic por ISBN en ISBNdb, lo crea si no existe en la BD local, y lo añade a la biblioteca. Operación idempotente.

**Body:**
```json
{ "isbn": "978-1-4012-0841-4", "collectionStatus": "IN_COLLECTION" }
```

---

### `POST /my-library/import`
Importa biblioteca desde un archivo CSV. `multipart/form-data` con campo `file`.

---

### `PATCH /my-library/:comicId`
Actualiza estado, puntuación, notas u overrides de un cómic en la biblioteca.

**Body (todos opcionales):**
```json
{
  "collectionStatus": "LOANED",
  "readStatus": "READ",
  "saleStatus": null,
  "loanedTo": "Carlos",
  "rating": 4,
  "notes": "Actualizado",
  "titleOverride": "Maus (ed. especial)",
  "coverUrlOverride": "https://..."
}
```

---

### `DELETE /my-library/:comicId`
Elimina un cómic de la biblioteca.

---

### `DELETE /my-library/bulk`
Elimina varios cómics de la biblioteca a la vez.

**Body:** `{ "comicIds": ["cuid1", "cuid2"] }`

---

## Colecciones — `/collections` 🔒

### `GET /collections`
Lista las colecciones del usuario.

**Response 200:** array de `Collection` con contadores y preview de portadas.

---

### `GET /collections/:id`
Obtiene una colección específica con sus series.

---

### `POST /collections`
Crea una nueva colección. Automáticamente crea una serie "Principal".

**Body:**
```json
{ "name": "Mi Batman", "description": "...", "isPublic": false }
```

---

### `PATCH /collections/:id`
Actualiza nombre, descripción, visibilidad o rating.

---

### `DELETE /collections/:id`
Elimina una colección y sus series (los cómics en la biblioteca no se eliminan).

---

### `GET /collections/:id/comics`
Lista los cómics de una colección con su estado de usuario.

---

### `POST /collections/:id/comics`
Añade un cómic de la biblioteca a la colección.

**Body:** `{ "comicId": "cuid", "collectionSeriesId": "cuid-de-serie" }`

---

### `DELETE /collections/:id/comics/:comicId`
Quita un cómic de la colección (no lo elimina de la biblioteca).

---

## CollectionSeries — `/collections/:collectionId/series` 🔒

### `GET /collections/:collectionId/series`
Lista las series de una colección.

---

### `POST /collections/:collectionId/series`
Crea una nueva serie en la colección.

**Body:** `{ "name": "Arco 2" }`

---

### `PATCH /collections/:collectionId/series/:id`
Actualiza una serie.

**Body:** `{ "name": "Edición Deluxe", "totalVolumes": 12 }`

---

### `DELETE /collections/:collectionId/series/:id`
Elimina una serie (los cómics se desvinculan, no se eliminan).

---

## ISBNdb — `/isbndb` 🔒

Proxy a la API externa de [ISBNdb](https://isbndb.com). Fuente principal de metadatos de libros y cómics.

### `GET /isbndb/books/search`
Busca libros por título, autor, editorial, ISBN o tema.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `q` | string | Término de búsqueda |
| `page` | number | Página (default 1) |
| `pageSize` | number | Resultados por página (default 20) |

---

### `GET /isbndb/book/:isbn`
Obtiene un libro por ISBN-10 o ISBN-13.

---

### `GET /isbndb/book/:isbn/editions`
Obtiene todas las ediciones de un libro por ISBN.

---

### `POST /isbndb/books/bulk`
Obtiene múltiples libros por lista de ISBNs (máx. 100).

**Body:** `{ "isbns": ["978-...", "978-..."] }`

---

### `GET /isbndb/authors/search`
Busca autores/dibujantes por nombre. **Query:** `?q=Moebius`

---

### `GET /isbndb/author/:name`
Obtiene los libros de un autor/dibujante.

---

### `GET /isbndb/publishers/search`
Busca editoriales por nombre.

---

### `GET /isbndb/publisher/:name`
Obtiene los libros de una editorial.

---

### `GET /isbndb/subjects/search`
Busca temas/géneros.

---

### `GET /isbndb/subject/:name`
Obtiene los libros de un tema/género.

---

### `GET /isbndb/stats`
Estadísticas globales de la base de datos de ISBNdb.

---

### `GET /isbndb/key`
Información y cuota de la API key activa.

---

### `POST /isbndb/import`
Importa un libro de ISBNdb como cómic en la BD local. Idempotente: si ya existe por ISBN, devuelve el existente.

**Body:** `{ "book": { <objeto IsbndbBook> } }`

**Response 200:**
```json
{
  "comic": { "id": "cuid", "title": "Watchmen", "isbn": "978-...", ... },
  "imported": true
}
```
`imported: false` si el cómic ya existía en la BD local.

---

## IA — `/ai` 🔒

### `POST /ai/recommend`
Genera recomendaciones personalizadas basadas en la biblioteca del usuario.

Analiza: series, editoriales, etiquetas y estilos de dibujo. El estilo gráfico tiene peso prioritario.
Usa Claude Haiku (Anthropic).

**Response 200:**
```json
{
  "recommendations": [
    {
      "title": "Blueberry",
      "author": "Jean Girard (Moebius)",
      "reason": "Dado que tienes obras de Moebius y valoras la línea clara, Blueberry combina ese estilo con una narrativa western única."
    }
  ]
}
```

---

## Usuarios — `/users` 🔒

### `PATCH /users/me`
Actualiza el perfil del usuario.

**Body:** `{ "username": "nuevo_nombre", "language": "en" }`

---

### `PATCH /users/me/password`
Cambia la contraseña.

**Body:**
```json
{
  "currentPassword": "secreto123",
  "newPassword": "nuevaContraseña456"
}
```

**Response 401** si la contraseña actual es incorrecta.
