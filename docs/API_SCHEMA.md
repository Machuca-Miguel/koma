# API Schema — Koma

Base URL: `http://localhost:3000`
Swagger interactivo: `http://localhost:3000/api/docs`

Todas las rutas excepto `/auth/register` y `/auth/login` requieren:
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

### `POST /auth/me` 🔒
Devuelve el perfil del usuario autenticado.

**Response 200:**
```json
{ "id": "cuid", "email": "...", "username": "miguel" }
```

---

## Comics — `/comics` 🔒

Cómics importados/creados en la BD local (PostgreSQL).

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
  "data": [{ "id": "...", "title": "Batman", "issueNumber": "1", ... }],
  "total": 42, "page": 1, "limit": 20, "totalPages": 3
}
```

---

### `GET /comics/:id`
Obtiene un cómic con sus tags.

**Response 200:**
```json
{
  "id": "cuid",
  "title": "Batman",
  "issueNumber": "404",
  "publisher": "DC Comics",
  "year": 1987,
  "synopsis": "...",
  "coverUrl": "https://covers.openlibrary.org/...",
  "externalId": "gcd-123456",
  "externalApi": "gcd",
  "createdAt": "2026-01-01T00:00:00Z",
  "tags": [{ "tag": { "id": "...", "name": "superhéroe", "slug": "superheroe" } }]
}
```

---

### `POST /comics`
Crea un cómic manualmente.

**Body:**
```json
{
  "title": "Watchmen",
  "issueNumber": "1",
  "publisher": "DC Comics",
  "year": 1986,
  "synopsis": "...",
  "coverUrl": "https://..."
}
```

---

### `PATCH /comics/:id`
Actualiza campos de un cómic (todos opcionales).

---

### `DELETE /comics/:id`
Elimina un cómic.

---

## Biblioteca personal — `/my-library` 🔒

Gestión de la colección personal del usuario (tabla `user_comics`).

### `GET /my-library`
Obtiene la biblioteca del usuario con paginación.

**Query params:**
| Param | Tipo | Valores |
|---|---|---|
| `status` | string | `OWNED` \| `READ` \| `WISHLIST` \| `FAVORITE` |
| `page` | number | default 1 |
| `limit` | number | default 20 |

**Response 200:**
```json
{
  "data": [{
    "id": "...",
    "status": "OWNED",
    "rating": 4,
    "notes": "Obra maestra",
    "addedAt": "2026-01-01T00:00:00Z",
    "comic": { ... }
  }],
  "total": 10, "page": 1, "limit": 20, "totalPages": 1
}
```

---

### `GET /my-library/comic/:comicId`
Obtiene la entrada de biblioteca para un cómic específico. Devuelve `null` si no está en la biblioteca del usuario.

---

### `GET /my-library/stats`
Estadísticas de la biblioteca.

**Response 200:**
```json
{
  "byStatus": { "OWNED": 12, "READ": 8, "WISHLIST": 3, "FAVORITE": 2 },
  "totalRated": 10,
  "averageRating": 4.2
}
```

---

### `POST /my-library`
Añade un cómic a la biblioteca.

**Body:**
```json
{
  "comicId": "cuid-del-comic",
  "status": "OWNED",
  "rating": 5,
  "notes": "Mi favorito"
}
```

---

### `PATCH /my-library/:comicId`
Actualiza estado, puntuación o notas (todos opcionales).

**Body:**
```json
{ "status": "READ", "rating": 4, "notes": "Actualizado" }
```

---

### `DELETE /my-library/:comicId`
Elimina un cómic de la biblioteca.

---

## Colecciones — `/collections` 🔒

### `GET /collections`
Lista las colecciones del usuario.

**Response 200:** array de `Collection` con `_count.comics`.

---

### `GET /collections/:id`
Obtiene una colección específica.

---

### `POST /collections`
Crea una nueva colección.

**Body:**
```json
{ "name": "Mi Batman", "description": "...", "isPublic": false }
```

---

### `PATCH /collections/:id`
Actualiza nombre, descripción o visibilidad.

---

### `DELETE /collections/:id`
Elimina una colección.

---

### `GET /collections/:id/comics`
Lista los cómics de una colección.

---

### `POST /collections/:id/comics`
Añade un cómic a la colección.

**Body:** `{ "comicId": "cuid" }`

---

### `DELETE /collections/:id/comics/:comicId`
Quita un cómic de la colección.

---

## GCD — `/gcd` 🔒

Acceso a la base de datos local de Grand Comics Database (MySQL, solo lectura).

### `GET /gcd/search`
Busca en el catálogo GCD.

**Query params:**
| Param | Tipo | Descripción |
|---|---|---|
| `q` | string | Nombre de la serie |
| `publisher` | string | Nombre de la editorial |
| `creator` | string | Nombre del creador |
| `year` | number | Año de publicación |
| `page` | number | Página (default 1, 20 resultados/página) |

**Response 200:**
```json
{
  "data": [{
    "externalId": "gcd-123456",
    "title": "Batman",
    "issueNumber": "404",
    "publisher": "DC Comics",
    "year": 1987,
    "synopsis": "...",
    "coverUrl": "https://covers.openlibrary.org/b/isbn/..."
  }],
  "total": 350,
  "page": 1
}
```

---

### `GET /gcd/detail/:id`
Detalle completo de un número GCD. El `:id` puede ser `"gcd-123456"` o `"123456"`.

**Response 200:**
```json
{
  "externalId": "gcd-123456",
  "title": "Batman",
  "issueNumber": "404",
  "publisher": "DC Comics",
  "year": 1987,
  "synopsis": "...",
  "coverUrl": "...",
  "pageCount": 48,
  "price": "$1.00",
  "onSaleDate": "1987-01-01",
  "barcode": "...",
  "isbn": "...",
  "creators": [
    { "role": "Guion", "names": ["Doug Moench"] },
    { "role": "Dibujo", "names": ["Don Newton"] }
  ],
  "stories": [{
    "title": "The Diplomat's Son",
    "type": "Comic Story",
    "pageCount": 22,
    "synopsis": "...",
    "genre": "superhero",
    "characters": "Batman; Robin",
    "feature": "Batman",
    "firstLine": "It was a dark and stormy night..."
  }],
  "seriesInfo": {
    "name": "Batman",
    "format": "comic",
    "yearBegan": 1940,
    "issueCount": 713,
    "color": "color",
    "dimensions": "Standard Modern Age US",
    "binding": "saddle-stitched"
  },
  "publisherInfo": {
    "name": "DC Comics",
    "yearBegan": 1934,
    "url": "https://www.dccomics.com"
  }
}
```

---

### `POST /gcd/import`
Importa un cómic de GCD a la BD local (PostgreSQL). Idempotente: si ya existe, devuelve el existente.

**Body:**
```json
{ "externalId": "gcd-123456" }
```

**Response 200:**
```json
{
  "comic": { "id": "cuid", "title": "Batman", ... },
  "imported": true
}
```
`imported: false` si el cómic ya existía.
