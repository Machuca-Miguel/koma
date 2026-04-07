# Plan de QA — Koma

> Versión: 1.0 · Fecha: 2026-03-29
> Alcance: QA manual exhaustivo + evaluación de adaptabilidad para QA automatizado

---

## 1. Entorno de prueba

### Requisitos previos
- Backend corriendo en `http://localhost:3000` (`npm run start:dev` en `backend/`)
- Frontend corriendo en `http://localhost:5173` (`npm run dev` en `frontend/`)
- Base de datos PostgreSQL (Neon) con migraciones aplicadas
- Base de datos GCD MySQL local activa
- Variable `ANTHROPIC_API_KEY` configurada en `.env` (para tests de Discover)

### Cuentas de prueba recomendadas
- Crear al menos dos cuentas para probar aislamiento de datos:
  - `qa_user_a@test.com` / `TestPass123`
  - `qa_user_b@test.com` / `TestPass123`

---

## 2. Plan de QA Manual

---

### MÓDULO A — Autenticación

#### A-01: Registro correcto
1. Ir a `/register`
2. Rellenar email válido, username >= 3 chars, password >= 6 chars
3. Pulsar "Crear cuenta"
4. **Esperado:** redirige a `/dashboard`, nombre de usuario visible en el saludo

#### A-02: Validación de registro — campos inválidos
| Caso | Acción | Esperado |
|---|---|---|
| Email inválido | `noesmail` | Error "Email inválido" bajo el campo |
| Username corto | `ab` | Error "Mínimo 3 caracteres" |
| Username largo | 31 caracteres | Error "Máximo 30 caracteres" |
| Password corta | `12345` | Error "Mínimo 6 caracteres" |
| Campos vacíos | Submit sin rellenar | Errores en cada campo obligatorio |

#### A-03: Registro con email duplicado
1. Registrarse con `qa_user_a@test.com`
2. Intentar registrarse de nuevo con el mismo email
3. **Esperado:** toast de error visible

#### A-04: Login correcto
1. Ir a `/login`
2. Introducir credenciales válidas
3. **Esperado:** redirige a `/dashboard`

#### A-05: Login con credenciales incorrectas
1. Introducir email correcto + password incorrecta
2. **Esperado:** toast de error "Email o contraseña incorrectos"

#### A-06: Animación de panel (desktop ≥ 768px)
1. Abrir `/login` en ventana >= 768px de ancho
2. Pulsar el link "¿Sin cuenta? Regístrate"
3. **Esperado:** panel teal se desliza de derecha a izquierda suavemente (~400ms)
4. Pulsar "¿Ya tienes cuenta? Inicia sesión"
5. **Esperado:** panel vuelve a la derecha

#### A-07: Persistencia de sesión
1. Hacer login
2. Recargar la página (F5)
3. **Esperado:** sigue en `/dashboard`, no redirige a `/login`

#### A-08: Rutas protegidas sin sesión
1. Sin estar logueado, navegar a `/library`
2. **Esperado:** redirige a `/login`

#### A-09: Rutas públicas con sesión activa
1. Estando logueado, navegar a `/login`
2. **Esperado:** redirige a `/dashboard`

---

### MÓDULO B — Dashboard

#### B-01: Saludo por hora
1. Verificar el saludo según la hora actual:
   - 00:00–11:59 → "Buenos días"
   - 12:00–19:59 → "Buenas tardes"
   - 20:00–23:59 → "Buenas noches"

#### B-02: Estadísticas con colección vacía
1. Login con usuario sin cómics
2. **Esperado:** contador "0 cómics", tarjetas de stats en 0, mensaje de biblioteca vacía

#### B-03: Estadísticas con cómics
1. Añadir cómics con distintos estados
2. **Esperado:** cada tarjeta refleja el recuento correcto; puntuación media actualizada

#### B-04: Enlace desde contador de colección
1. Pulsar el número de cómics en el texto del dashboard
2. **Esperado:** navega a `/library`

---

### MÓDULO C — Búsqueda GCD

#### C-01: Búsqueda básica
1. Ir a `/search`
2. Escribir "Asterix" y pulsar "Buscar"
3. **Esperado:** grid de resultados con portadas y datos básicos

#### C-02: Búsqueda sin resultados
1. Buscar una cadena sin resultados (ej. `zzz_inexistente_zzz`)
2. **Esperado:** mensaje "Sin resultados", opción "Añadir manualmente" visible

#### C-03: Filtros avanzados
1. Búsqueda con filtro de editorial "Dargaud"
2. **Esperado:** solo resultados de esa editorial; badge "Filtros activos" visible
3. Pulsar "Limpiar filtros"
4. **Esperado:** filtros reseteados

#### C-04: Año de búsqueda — validación
1. Introducir año "1800" en el filtro de año
2. **Esperado:** el input no acepta valores < 1900 (atributo min)
3. Introducir año superior al actual
4. **Esperado:** el input rechaza valores > año actual

#### C-05: Panel de detalle GCD
1. Pulsar un resultado de la búsqueda
2. **Esperado:** panel lateral con: creadores agrupados por rol, sinopsis, historias, info de serie y editorial, precio e ISBN si existen

#### C-06: Importar cómic desde GCD
1. Pulsar "Añadir a biblioteca" en un resultado
2. **Esperado:** botón cambia a ✓ con texto "Añadido"; toast de éxito
3. Navegar a `/library`
4. **Esperado:** el cómic aparece con badge "Tengo"

#### C-07: Doble importación del mismo cómic
1. Intentar añadir un cómic que ya está en la biblioteca
2. **Esperado:** no duplica; el ✓ ya está visible desde el inicio

#### C-08: Paginación de resultados
1. Con una búsqueda que devuelva > 20 resultados
2. Pulsar "Siguiente página"
3. **Esperado:** carga los 20 siguientes; página actual actualizada
4. Pulsar "Página anterior"
5. **Esperado:** vuelve a los primeros 20

#### C-09: Añadir manualmente
1. Buscar algo sin resultados → "Añadir manualmente"
2. Intentar enviar sin título
3. **Esperado:** botón deshabilitado
4. Rellenar Título y pulsar "Añadir a biblioteca"
5. **Esperado:** toast de éxito; cómic visible en `/library`

#### C-10: Añadir manual — validación año
1. En el formulario manual, introducir año "1800"
2. **Esperado:** input no acepta < 1900
3. Introducir año "2200"
4. **Esperado:** input no acepta > 2099

---

### MÓDULO D — Biblioteca

#### D-01: Vista vacía
1. Usuario sin cómics → ir a `/library`
2. **Esperado:** mensaje "Tu biblioteca está vacía" con enlace a búsqueda

#### D-02: Grid de tarjetas
1. Con cómics en la biblioteca, verificar cada tarjeta:
   - Portada (o icono placeholder si no hay)
   - Título y número de issue
   - Editorial (si existe)
   - Etiquetas (si las tiene)
   - Badges de estado activos
   - Badge ⚠ si falta portada o sinopsis

#### D-03: Búsqueda en biblioteca — debounce
1. Escribir "ast" en el buscador
2. **Esperado:** no busca inmediatamente; espera ~300ms; muestra cómics cuyo título/serie/editorial contenga "ast"
3. Limpiar búsqueda con la X
4. **Esperado:** vuelve a mostrar todos los cómics

#### D-04: Búsqueda sin resultados
1. Buscar algo que no existe en la colección
2. **Esperado:** mensaje "Sin resultados para 'X'" con botón limpiar

#### D-05: Filtro por estado
1. Pulsar "Leídos"
2. **Esperado:** solo cómics con `isRead=true`; contador actualizado
3. Pulsar "Favoritos"
4. **Esperado:** solo cómics con `isFavorite=true`
5. Pulsar "Todos"
6. **Esperado:** vuelve al listado completo

#### D-06: Filtro por etiqueta
1. Pulsar un chip de etiqueta
2. **Esperado:** solo cómics con esa etiqueta; chip resaltado
3. Pulsar el mismo chip de nuevo
4. **Esperado:** deselecciona; vuelve a todos

#### D-07: Filtros avanzados — editorial
1. Abrir "Más filtros"
2. Escribir una editorial (ej. "Dargaud")
3. **Esperado:** after ~300ms, filtra por esa editorial; badge "1" en el botón
4. Limpiar con el botón "Limpiar filtros" dentro del panel
5. **Esperado:** badge desaparece; resultados completos

#### D-08: Filtros avanzados — rango de años
1. Introducir Año desde: 1980, Año hasta: 1990
2. **Esperado:** solo cómics con year entre 1980 y 1990

#### D-09: Ordenación por serie (default)
1. Con varios cómics de distintas series, verificar que `sortBy=series_asc` está activo por defecto
2. **Esperado:** grupos de serie con cabecera; dentro de cada grupo, ordenados por número de issue ascendente

#### D-10: Ordenación — otras opciones
| Opción | Esperado |
|---|---|
| Título | Orden A→Z por título |
| Año | Ascendente por año de publicación |
| Añadido | Más reciente primero |
| Puntuación | Mayor puntuación primero |

#### D-11: Agrupación de series — condiciones de desactivación
1. Aplicar filtro de búsqueda de texto
2. **Esperado:** desaparece la agrupación, grid plano
3. Activar filtro de etiqueta
4. **Esperado:** desaparece la agrupación, grid plano
5. Cambiar ordenación a "Título"
6. **Esperado:** desaparece la agrupación

#### D-12: Completitud de serie
1. Pulsar "Ver qué falta" en una cabecera de serie con cómics de GCD
2. **Esperado:** sheet lateral con barra de progreso (X/Y) y lista de issues faltantes
3. Pulsar "Añadir a wishlist" en un issue faltante
4. **Esperado:** toast "Añadido a wishlist"; el issue desaparece de la lista de faltantes; reaparece en la biblioteca con badge "Wishlist"

#### D-13: Eliminar cómic
1. Pulsar el icono de papelera en una tarjeta
2. **Esperado:** ícono cambia a ✓ (confirmación pendiente)
3. Pulsar el ✓
4. **Esperado:** toast de éxito; tarjeta desaparece; contador actualizado
5. Pulsar papelera y luego hacer clic fuera sin confirmar
6. **Esperado:** el icono vuelve a la papelera (sin borrar)

#### D-14: Paginación
1. Con más de 20 cómics, verificar que aparece la paginación
2. Navegar entre páginas
3. **Esperado:** indicador "X / Y" actualizado; primera/última página deshabilitan los botones correspondientes

---

### MÓDULO E — Ficha de Cómic

#### E-01: Carga completa desde GCD
1. Pulsar un cómic importado de GCD
2. **Esperado:** ficha con portada, todas las secciones (creadores, historias, serie, editorial, publicación) visibles si GCD las tiene

#### E-02: Cómic con datos incompletos
1. Abrir un cómic sin sinopsis o sin portada
2. **Esperado:** banner ámbar "datos incompletos" visible en el hero

#### E-03: Editar metadatos — EditSheet
1. Pulsar el lápiz en la esquina del hero
2. **Esperado:** sheet lateral abierto con todos los campos rellenos con datos actuales
3. Borrar el título
4. **Esperado:** botón "Guardar" deshabilitado
5. Escribir un título válido y cambiar otros campos
6. Pulsar "Guardar"
7. **Esperado:** sheet se cierra; toast "Cambios guardados"; hero refleja los nuevos datos

#### E-04: EditSheet — validación año
1. Introducir año 1800
2. **Esperado:** campo no acepta < 1900
3. Introducir año 2200
4. **Esperado:** campo no acepta > 2099

#### E-05: EditSheet — encuadernación
1. Abrir EditSheet → campo Encuadernación
2. **Esperado:** dropdown con opciones: — / Cartoné / Tapa blanda / Bolsillo / Omnibus / Tapa dura
3. Seleccionar "Cartoné" → Guardar
4. **Esperado:** se guarda correctamente; visible en `/library` si se usa filtro

#### E-06: Gestión de etiquetas
1. Escribir "noir" en el campo de etiquetas + Enter
2. **Esperado:** badge "noir" aparece inmediatamente
3. Escribir una letra del tag existente
4. **Esperado:** autocompletado muestra sugerencias
5. Clic en una sugerencia
6. **Esperado:** etiqueta añadida sin duplicar
7. Pulsar × en una etiqueta
8. **Esperado:** etiqueta eliminada; desaparece de los filtros de biblioteca si era la única

#### E-07: Estado multi-flag
1. Activar "Tengo" + "Leído" + "Favorito" en el mismo cómic
2. **Esperado:** los tres toggles activos simultáneamente; los tres badges visibles en `/library`

#### E-08: Préstamo
1. Activar "Prestado"
2. Escribir "Juan" en "Prestado a"
3. **Esperado:** badge "Prestado" visible en `/library`

#### E-09: Puntuación con estrellas
1. Pulsar la 3ª estrella
2. **Esperado:** estrellas 1–3 rellenas; valor guardado
3. Pulsar la 3ª estrella de nuevo
4. **Esperado:** puntuación eliminada (si el componente lo soporta)
5. Verificar que la media del dashboard se actualiza

#### E-10: Notas con autoguardado
1. Escribir texto en el campo de notas
2. **Esperado:** tras ~500ms se guarda automáticamente (sin pulsar botón)
3. Recargar la página
4. **Esperado:** las notas persisten

#### E-11: Añadir a biblioteca desde la ficha
1. Abrir un cómic que NO está en la biblioteca (acceder directamente por URL si es posible)
2. **Esperado:** botón "Añadir a biblioteca" visible; sección de estado no visible
3. Pulsar el botón
4. **Esperado:** toast de éxito; sección de estado aparece

#### E-12: Dónde comprar (sección wishlist)
1. Marcar un cómic como "Wishlist" y asegurarse de que tiene ISBN
2. **Esperado:** sección "Dónde comprar" visible con: botón copiar ISBN, links a Amazon.es / FNAC.es / Google
3. Pulsar "Copiar ISBN"
4. **Esperado:** toast "ISBN copiado"; valor en el portapapeles correcto
5. Desactivar "Wishlist"
6. **Esperado:** sección "Dónde comprar" desaparece

#### E-13: Botón volver
1. Navegar a la ficha desde la biblioteca
2. Pulsar "← Volver"
3. **Esperado:** vuelve a `/library`

---

### MÓDULO F — Colecciones

#### F-01: Crear colección
1. Ir a `/collections` → "Nueva colección"
2. Dejar nombre vacío → pulsar Crear
3. **Esperado:** error "El nombre es requerido"
4. Introducir nombre de 61 chars
5. **Esperado:** error "Máximo 60 caracteres"
6. Nombre válido + descripción opcional → Crear
7. **Esperado:** colección aparece en la lista; toast de éxito

#### F-02: Editar colección
1. Abrir una colección → editar
2. Cambiar nombre y visibilidad
3. **Esperado:** cambios reflejados tras guardar

#### F-03: Añadir cómic a colección
1. Abrir una colección → "Añadir cómic"
2. Seleccionar un cómic de la biblioteca
3. **Esperado:** cómic aparece en la colección; contador incrementado

#### F-04: Cómics ya en la colección
1. Intentar añadir un cómic que ya está en la colección
2. **Esperado:** no aparece en el selector (ya filtrado)

#### F-05: Eliminar cómic de colección
1. Expandir colección → eliminar un cómic
2. **Esperado:** cómic desaparece de la colección pero sigue en `/library`

#### F-06: Eliminar colección
1. Pulsar eliminar en una colección
2. **Esperado:** confirmación; al confirmar desaparece con toast

#### F-07: Visibilidad pública/privada
1. Crear colección pública y otra privada
2. **Esperado:** badge visible diferenciando ambas

---

### MÓDULO G — Descubrir

#### G-01: Recomendaciones sin colección
1. Usuario con colección vacía → ir a `/discover` → "Generar recomendaciones"
2. **Esperado:** no genera recomendaciones (retorna lista vacía sin error)

#### G-02: Recomendaciones con colección
1. Con al menos 5 cómics en la biblioteca (marcados como "Tengo")
2. Pulsar "Generar recomendaciones"
3. **Esperado:** spinner durante la petición; aparecen 6 tarjetas con título, autor y justificación personalizada
4. Verificar que la justificación menciona relación con la colección existente

#### G-03: Error de IA
1. Con `ANTHROPIC_API_KEY` inválida, intentar generar recomendaciones
2. **Esperado:** mensaje de error "No se pudo generar recomendaciones"

#### G-04: Sección de series
1. Con cómics con campo `series` rellenado
2. Ir a `/discover` sección "Tus series"
3. **Esperado:** lista de series ordenada por número de issues (mayor primero)
4. Pulsar una serie
5. **Esperado:** navega a `/library`

---

### MÓDULO H — Ajustes

#### H-01: Cambio de username
1. Ir a `/settings` → Cuenta
2. Introducir username de 2 chars
3. **Esperado:** error "Mínimo 3 caracteres"
4. Introducir un username válido y único → Actualizar
5. **Esperado:** toast "Usuario actualizado"; nombre actualizado en la sidebar

#### H-02: Username en uso
1. Intentar cambiar a un username que ya existe en otra cuenta
2. **Esperado:** toast "Ese nombre de usuario ya está en uso"

#### H-03: Cambio de idioma
1. Cambiar a "English"
2. **Esperado:** toda la interfaz cambia a inglés inmediatamente; sin recarga de página
3. Recargar la página
4. **Esperado:** persiste en inglés

#### H-04: Cambio de tema
1. Seleccionar "Oscuro"
2. **Esperado:** fondo oscuro inmediato en toda la app
3. Seleccionar "Sistema"
4. **Esperado:** sigue el tema del SO

#### H-05: Cambio de contraseña
1. Contraseña actual incorrecta → "Cambiar contraseña"
2. **Esperado:** toast "La contraseña actual es incorrecta"
3. Nueva contraseña de 5 chars
4. **Esperado:** error "Mínimo 6 caracteres"
5. Nueva ≠ confirmación
6. **Esperado:** error "Las contraseñas no coinciden"
7. Todo correcto → enviar
8. **Esperado:** toast "Contraseña cambiada"; campos reseteados

#### H-06: Export CSV
1. Ir a Datos → "Exportar CSV"
2. **Esperado:** descarga el fichero `koma-library.csv`
3. Abrir el CSV y verificar columnas: `title, series, issueNumber, publisher, year, isbn, binding, isOwned, isRead, isWishlist, isFavorite, rating, notes, addedAt`

#### H-07: Export JSON
1. "Exportar JSON"
2. **Esperado:** descarga `koma-library.json` con array de objetos; estructura idéntica a las columnas del CSV

---

### MÓDULO I — Navegación y UX

#### I-01: Sidebar activa
1. Navegar entre secciones
2. **Esperado:** link activo resaltado en la sidebar

#### I-02: Rutas inexistentes
1. Navegar a `/ruta_que_no_existe`
2. **Esperado:** redirige silenciosamente a `/dashboard`

#### I-03: Enlace a cómic desde búsqueda
1. Buscar en GCD → panel de detalle → pulsar el cómic ya importado
2. **Esperado:** navega a `/comics/:id`

#### I-04: Skeletons de carga
1. Recargar biblioteca con red lenta (throttle en DevTools)
2. **Esperado:** skeletons visibles durante la carga; sin layout shift al cargar

#### I-05: Toasts
1. Realizar una operación con éxito (añadir, guardar)
2. **Esperado:** toast verde/por defecto en la esquina; desaparece automáticamente
3. Simular error (desconectar red) → intentar guardar
4. **Esperado:** toast rojo de error

---

### MÓDULO J — Internacionalización

#### J-01: Todos los textos en español (por defecto)
1. Usuario con idioma ES (por defecto)
2. Recorrer todas las pantallas
3. **Esperado:** ningún texto en inglés visible; ninguna clave de traducción (`library.title`, etc.) expuesta

#### J-02: Todos los textos en inglés
1. Cambiar idioma a EN en Ajustes
2. Recorrer todas las pantallas
3. **Esperado:** todos los textos en inglés; mismo recorrido que J-01

#### J-03: Plurales
1. Con 1 cómic → dashboard
2. **Esperado:** "Tienes 1 cómic en tu colección" (singular)
3. Con 2+ cómics
4. **Esperado:** "Tienes X cómics en tu colección" (plural)

---

### MÓDULO K — Responsive / Mobile

#### K-01: Mobile (< 768px)
1. Reducir ventana a 375px de ancho (iPhone SE)
2. Verificar en cada página:
   - Auth: formulario en card única sin panel animado
   - Dashboard: tarjetas en columna o grid 2x
   - Library: grid 2 columnas mínimo; buscador usable
   - Search: formulario apilado verticalmente
   - Comic detail: portada + info en columna única
   - Settings: todo legible, sin overflow horizontal

#### K-02: Tablet (~768px)
1. Verificar sidebar visible; grid con más columnas

---

## 3. Checklist de smoke test (pre-producción)

Para una verificación rápida antes de desplegar:

- [ ] Login correcto → dashboard carga con stats
- [ ] Buscar "Blake" en GCD → importar → aparece en biblioteca
- [ ] Abrir ficha → editar editorial → guardar → cambio visible
- [ ] Añadir tag "aventura" → filtrar por ese tag en biblioteca → funciona
- [ ] Completitud de serie → sheet abre y muestra progreso
- [ ] Generar recomendaciones IA → aparecen 6 tarjetas
- [ ] Exportar JSON → descarga correcta
- [ ] Cambiar idioma EN → todos los textos en inglés → cambiar a ES → vuelve

---

## 4. Evaluación de adaptabilidad para QA automatizado

### 4.1 Estado actual del código

| Aspecto | Estado | Notas |
|---|---|---|
| Tests unitarios backend | ✅ Jest, 51 tests | Cubren auth.service, comics.service, user-comics.service |
| Tests unitarios frontend | ✅ Vitest, 25 tests | Cubren componentes básicos |
| IDs/atributos `data-testid` | ❌ No implementados | Necesario para Playwright/Cypress |
| Separación de lógica | ✅ Buena | API calls en `src/api/`, lógica de negocio en services |
| Endpoints documentados | ✅ Swagger en `/api/docs` | Base para tests de contrato |
| i18n desacoplado | ✅ JSON separado | Facilita aserciones de texto |

### 4.2 Recomendaciones para QA automatizado

#### Tests E2E — Playwright (recomendado para este stack)

```bash
# Instalación
npm install -D @playwright/test
npx playwright install
```

**Por qué Playwright sobre Cypress:**
- Soporte nativo para múltiples tabs/ventanas (útil para el panel GCD)
- API async/await natural con TypeScript
- Más rápido en CI; soporte Firefox y WebKit

**Estructura recomendada:**
```
e2e/
├── auth.spec.ts          # Módulo A
├── library.spec.ts       # Módulos C, D
├── comic-detail.spec.ts  # Módulo E
├── collections.spec.ts   # Módulo F
├── settings.spec.ts      # Módulo H
├── fixtures/
│   └── user.fixture.ts   # Setup de usuario de test
└── playwright.config.ts
```

**Acciones previas necesarias en el código:**

1. **Añadir `data-testid` a elementos interactivos clave** — sin esto, los selectores son frágiles:
   ```tsx
   // Ejemplos
   <Button data-testid="add-to-library-btn">Añadir</Button>
   <Input data-testid="search-library-input" />
   <Card data-testid={`comic-card-${comic.id}`} />
   ```

2. **Variables de entorno para test:**
   ```env
   # .env.test
   DATABASE_URL="postgresql://..." # BD de test separada
   JWT_SECRET="test-secret"
   ANTHROPIC_API_KEY="test-key" # Mock en tests E2E
   ```

3. **Endpoint de reset de datos (solo en test):**
   ```typescript
   // backend — solo activo si NODE_ENV=test
   @Delete('test/reset')
   async reset() { await this.prisma.userComic.deleteMany(); ... }
   ```

#### Tests de API — Supertest (ya disponible en Jest)

Los tests de backend actuales usan mocks. Para tests de integración reales:

```typescript
// user-comics.e2e-spec.ts
describe('GET /my-library', () => {
  it('filtra por publisher', async () => {
    const res = await request(app.getHttpServer())
      .get('/my-library?publisher=Dargaud')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.every(uc => uc.comic.publisher === 'Dargaud')).toBe(true)
  })
})
```

#### Tests de contrato — OpenAPI

Con Swagger ya activo, se pueden generar tests de contrato automáticamente:
```bash
npm install -D @schemathesis/schemathesis  # o dredd
```

### 4.3 Casos prioritarios para automatizar primero

Por impacto y estabilidad, automatizar en este orden:

1. **Auth flow completo** (login/register/logout/session persistence)
2. **Importar desde GCD y verificar en biblioteca**
3. **Editar metadatos de un cómic**
4. **Filtros de biblioteca** (búsqueda, tag, estado, sort)
5. **Export CSV/JSON** (verificar contenido del archivo)
6. **Validaciones de formulario** (errores en campos inválidos)

### 4.4 Mocking de dependencias externas

| Dependencia | Estrategia |
|---|---|
| GCD MySQL | Fixture de datos o base de test con subset mínimo |
| Anthropic API | Intercept de red con Playwright (`page.route`) o mock del servicio |
| Neon PostgreSQL | BD local de test (`docker-compose.test.yml`) |

```typescript
// playwright — mock de IA
await page.route('**/ai/recommend', async (route) => {
  await route.fulfill({
    json: [
      { title: 'Test Comic', author: 'Test Author', why: 'Test reason' }
    ]
  })
})
```
