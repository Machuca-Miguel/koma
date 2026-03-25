# Features — Koma

## Implementadas

### Autenticación
- Registro con email, username y contraseña
- Login con JWT (acceso persistente via localStorage)
- Perfil del usuario autenticado (`POST /auth/me`)
- Panel de auth con animación de transición login ↔ registro (desktop)
- Redirección automática si ya hay sesión / si no hay sesión

### Búsqueda GCD
- Búsqueda por nombre de serie (`q`)
- Filtros adicionales: editorial (`publisher`), creador (`creator`), año (`year`)
- Paginación de resultados (20 por página)
- Portadas via Open Library (cuando existe `valid_isbn` en GCD)
- Panel lateral con detalle completo al pulsar un resultado

### Detalle de cómic
Vista completa en `/comics/:id` con 8 secciones:
- **Hero** — portada, título, número, editorial, año, páginas, precio
- **Estado de usuario** — selector de estado, puntuación con estrellas, notas (con debounce)
- **Sinopsis** — texto completo
- **Creadores** — agrupados por rol (Guion, Dibujo, Tintas, Color, Rótulos, Edición)
- **Historias** — por relato: tipo, páginas, género, personajes, sinopsis, primera línea
- **Serie** — formato, años, total de números, color, dimensiones, papel, encuadernación
- **Editorial** — años activa, web oficial
- **Publicación** — precio, fecha de venta, código de barras, ISBN

### Biblioteca personal
- Importar cómics desde GCD a la colección personal
- Estados: `OWNED` (Tengo), `READ` (Leído), `WISHLIST` (Lo quiero), `FAVORITE` (Favorito)
- Puntuación 1–5 estrellas
- Notas de texto libre por cómic
- Filtros por estado en la vista de biblioteca
- Paginación (12 por página)
- Añadir cómics manualmente (sin necesidad de GCD)
- Editar estado y puntuación directamente desde la biblioteca

### Colecciones
- Crear/editar/eliminar colecciones temáticas (ej. "Mi colección de Batman")
- Marcar colecciones como públicas o privadas
- Añadir/quitar cómics de la biblioteca a una colección
- Vista expandible con los cómics de cada colección

### Dashboard
- Estadísticas de la biblioteca por estado (OWNED, READ, WISHLIST, FAVORITE)
- Valoración media calculada
- Accesos rápidos a Biblioteca y Búsqueda

### UI/UX
- Tema claro / oscuro con `next-themes` (persiste entre sesiones)
- Diseño responsive (mobile + desktop)
- Skeletons de carga para evitar layout shift
- Toasts de feedback (éxito / error) con `sonner`
- Sidebar de navegación en desktop
- Formularios con validación en tiempo real (React Hook Form + Zod)

---

## Posibles features futuras

### Mejoras de búsqueda y catálogo
- Búsqueda por personaje (campo `characters` de `gcd_story`)
- Búsqueda por género (`genre` de `gcd_story`)
- Filtro por país/idioma de la serie (`gcd_series.country_id`, `language_id`)
- Autocompletado de editorial y creador en los filtros de búsqueda

### Biblioteca y colecciones
- Exportar la biblioteca a CSV/JSON
- Compartir enlace público de una colección (`isPublic = true`)
- Ordenación de la biblioteca (por año, editorial, fecha añadido)
- Vista de galería vs. lista en la biblioteca
- Estadísticas avanzadas: páginas leídas, número de series, editoriales

### Detalle de cómic
- Galería de variantes del mismo número
- Enlace a número anterior/siguiente de la misma serie
- Historial de lectura (fecha en que lo marcaste como READ)
- Portadas de portada alternativa si hay múltiples en GCD

### Social / compartir
- Perfil público con biblioteca visible
- Comparar colecciones con otro usuario
- Lista de deseos pública

### Técnico
- Caché de resultados GCD con Redis (búsquedas frecuentes)
- PWA / instalación en móvil
- Notificaciones de nuevos números de series seguidas
- Sincronización con servicios externos (p.ej. League of Comic Geeks)
