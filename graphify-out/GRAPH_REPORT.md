# Graph Report - .  (2026-04-16)

## Corpus Check
- 144 files · ~75,341 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 551 nodes · 824 edges · 41 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `IsbndbService` - 18 edges
2. `IsbndbController` - 16 edges
3. `UserComicsController` - 15 edges
4. `UserComicsService` - 15 edges
5. `CollectionsService` - 14 edges
6. `CollectionsController` - 13 edges
7. `ComicsController` - 11 edges
8. `ComicsService` - 11 edges
9. `UsersService` - 11 edges
10. `Koma Project (CLAUDE.md Context)` - 10 edges

## Surprising Connections (you probably didn't know these)
- `discoverApi (frontend AI recommendations client)` --cites--> `Discover AI Recommendations (Anthropic Claude haiku)`  [INFERRED]
  frontend/src/api/discover.ts → docs/features.md
- `UserComic Entity personal library` --shares_data_with--> `Multi-Flag Status System Tengo/Leido/Wishlist/Favorito/Prestado`  [INFERRED]
  CLAUDE.md → docs/app-flow.md
- `DiscoverPage /discover AI Recommendations + Series Summary` --conceptually_related_to--> `Discover Page /discover AI Recommendations Detail`  [INFERRED]
  CLAUDE.md → docs/app-flow.md
- `Authentication Flow JWT + bcrypt + passport` --conceptually_related_to--> `Graph Community 1 Auth AuthController AuthModule JwtStrategy GoogleStrategy`  [INFERRED]
  docs/architecture.md → graphify-out/GRAPH_REPORT.md
- `AiModule` --calls--> `discoverApi (frontend AI recommendations client)`  [INFERRED]
  backend/src/app.module.ts → frontend/src/api/discover.ts

## Hyperedges (group relationships)
- **Core Comic Data Model: Comic + Series + UserComic** — db_ComicEntity, db_SeriesEntity, db_UserComicEntity [EXTRACTED 0.97]
- **Full Authentication Flow Register/LocalLogin/GoogleOAuth to JWT to Protected Routes** — arch_auth_flow, memory_auth_three_paths, guia_google_oauth, arch_protected_routes, graph_community_auth [EXTRACTED 0.95]
- **Comic Import Pipeline Search to GCD/ISBNdb/Tebeosfera to ComicEntity to UserComic to Library** — appflow_search_page, appflow_gcd_integration, guia_isbndb_integration, claude_md_comic_entity, claude_md_usercomic_entity, appflow_library_page [EXTRACTED 0.90]
- **Core Data Hierarchy Collection-CollectionSeries-Comic plus UserComic multi-flags** — claude_md_collection_entity, claude_md_collection_series_entity, claude_md_comic_entity, claude_md_usercomic_entity, appflow_multistate_system [EXTRACTED 0.95]
- **AddToCollection Wizard Flow: Single & Multiple** — ComicDetailPage (mode=single), LibraryPage (mode=multiple, bulk-select), AddToCollectionSheet (unified wizard), STEP-1-select-or-create-collection, STEP-2-rename-or-select-series, CollectionsService (POST /collections), CollectionSeriesService (PATCH /series/:id), UserComicsService (POST /my-library/to-collection) [INFERRED 0.95]
  Unified wizard for adding comics to collections. Supports single-comic and multi-select modes. New collections auto-advance to series-rename step (PATCH before POST is atomic). Entry: ComicDetailPage button or LibraryPage multi-select toolbar.

## Communities

### Community 0 - "Frontend Feature Components"
Cohesion: 0.04
Nodes (8): handleClose(), handleConfirm(), hslToHex(), titleToColor(), titleToColorAlpha(), exitSelecting(), handleAddToCollection(), switchView()
Note: `handleAddToCollection()` is now the entry point into `AddToCollectionSheet` — a unified 2-step wizard modal (STEP 1: select/create collection; STEP 2: select/rename series) used by both `ComicDetailPage` (single mode) and `LibraryPage` (multi-select mode). Old separate modal variants are consolidated here.

### Community 1 - "App Flow Documentation"
Cohesion: 0.04
Nodes (71): AI Recommendations Claude Haiku via Anthropic SDK 6 personalized suggestions, Collections Page /collections Thematic Lists, Comic Detail Page /comics/:id, Dashboard Page /dashboard Collection Stats, Discover Page /discover AI Recommendations Detail, Export Feature CSV/JSON koma-library, GCD Integration local MySQL read-only series completeness, Internationalization i18n ES/EN (+63 more)

### Community 2 - "AI Recommendations Module"
Cohesion: 0.05
Nodes (20): AiController, AiModule, AiService, AppController, AppModule, AppService, CollectionSeriesModule, CollectionsModule (+12 more)

### Community 3 - "Auth Module (JWT + Google OAuth)"
Cohesion: 0.05
Nodes (13): AuthController, AuthModule, AuthService, GoogleAuthGuard, GoogleStrategy, JwtStrategy, LocalAuthGuard, LocalStrategy (+5 more)

### Community 4 - "App Root Module Registry"
Cohesion: 0.07
Nodes (29): AiModule, AppModule (NestJS Root), AuthModule, CollectionSeriesModule, CollectionsModule, ComicsModule, IsbndbModule, PrismaModule (+21 more)

### Community 5 - "Bootstrap & Core DTOs"
Cohesion: 0.08
Nodes (5): AddComicDto, UpdateUserComicDto, AddByIsbnDto, BulkDeleteDto, UserComicsController

### Community 6 - "Comics Module"
Cohesion: 0.12
Nodes (5): ComicsController, ComicsModule, CreateComicDto, QueryComicDto, UpdateComicDto

### Community 7 - "ISBNdb Service"
Cohesion: 0.2
Nodes (1): IsbndbService

### Community 8 - "UserComics Service (Library)"
Cohesion: 0.13
Nodes (3): buildOrderBy(), buildStatusWhere(), UserComicsService

### Community 9 - "ISBNdb Controller"
Cohesion: 0.12
Nodes (1): IsbndbController

### Community 10 - "Layout Components"
Cohesion: 0.14
Nodes (0): 

### Community 11 - "Collections Service"
Cohesion: 0.26
Nodes (1): CollectionsService

### Community 12 - "Collections Controller"
Cohesion: 0.15
Nodes (1): CollectionsController

### Community 13 - "Comics Service"
Cohesion: 0.25
Nodes (1): ComicsService

### Community 14 - "Users Service"
Cohesion: 0.25
Nodes (1): UsersService

### Community 15 - "Select UI Components"
Cohesion: 0.22
Nodes (0): 

### Community 16 - "CollectionSeries Service"
Cohesion: 0.38
Nodes (1): CollectionSeriesService

### Community 17 - "CollectionSeries Controller"
Cohesion: 0.33
Nodes (1): CollectionSeriesController

### Community 18 - "PublisherGroupCard"
Cohesion: 0.67
Nodes (2): getYearRange(), PublisherGroupCard()

### Community 19 - "Data Models (Entities)"
Cohesion: 0.5
Nodes (4): Comic DB entity (isbn, binding, drawingStyle, seriesId FK), Series DB entity (gcdSeriesId, totalIssues, isOngoing), UserComic DB entity (pivot User x Comic with multi-status), UserComic Multi-Status flags (isOwned|isRead|isWishlist|isFavorite|isLoaned)

### Community 20 - "Tebeosfera Test Scripts"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Create Series DTO"
Cohesion: 1.0
Nodes (1): CreateSeriesDto

### Community 22 - "Update Series DTO"
Cohesion: 1.0
Nodes (1): UpdateSeriesDto

### Community 23 - "Collection & Series Types"
Cohesion: 1.0
Nodes (2): Collection interface, CollectionSeries interface

### Community 24 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "SVG Assets"
Cohesion: 1.0
Nodes (2): React Logo, Vite Logo

### Community 26 - "Prisma Config"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Type Declarations"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Auth Spec Test"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Test Setup"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "API Route Schema"
Cohesion: 1.0
Nodes (1): API Routes reference (features.md / API_SCHEMA.md)

### Community 32 - "GCD Read-Only DB"
Cohesion: 1.0
Nodes (1): GCD MySQL (comics_db) - read-only ~3.5M issues

### Community 33 - "Library Series View Feature"
Cohesion: 1.0
Nodes (1): Library Series View feature (cards + completion tracking)

### Community 34 - "Search Sources Feature"
Cohesion: 1.0
Nodes (1): Search Sources: GCD, Google Books, Open Library, Tebeosfera, Whakoom

### Community 35 - "Favicon"
Cohesion: 1.0
Nodes (1): Koma App Favicon

### Community 36 - "Icon Sprites"
Cohesion: 1.0
Nodes (1): UI Icon Sprite Sheet

### Community 37 - "Hero Image"
Cohesion: 1.0
Nodes (1): Hero Image - Stacked Layers Illustration

### Community 38 - "Architecture Docs"
Cohesion: 1.0
Nodes (1): Project Directory Structure backend/frontend split

### Community 39 - "Manual Comic Add"
Cohesion: 1.0
Nodes (1): Manual Comic Creation no external DB required

### Community 40 - "Bulk Selection"
Cohesion: 1.0
Nodes (1): Bulk Selection multi-select for Add to Collection
Note: Bulk selection (LibraryPage) feeds into `AddToCollectionSheet` with `mode="multiple"` and `selectedComicIds[]`. Single-comic flow from `ComicDetailPage` uses `mode="single"`. Both share the same 2-step wizard component.

## Knowledge Gaps
- **AddToCollectionSheet unified modal (updated 2026-04-23):** Serves both single-comic (`ComicDetailPage`) and multi-select (`LibraryPage`) modes via `mode` prop. Wizard-based STEP 1/2 flow: STEP 1 selects or creates a collection; creating one auto-advances to STEP 2 with the "Principal" series pre-filled and editable. STEP 2 calls `PATCH /collections/:id/series/:id` before `POST /my-library/to-collection` if the series was renamed (atomic). Old separate modal variants (`AddCollectionBottomSheet`, `AddToCollectionDialog`) are superseded — connections should be routed through `AddToCollectionSheet`.
- **88 isolated node(s):** `AuthModule`, `ComicsModule`, `UserComicsModule`, `CollectionsModule`, `CollectionSeriesModule` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Tebeosfera Test Scripts`** (2 nodes): `test-tebeosfera.js`, `test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Series DTO`** (2 nodes): `create-series.dto.ts`, `CreateSeriesDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Series DTO`** (2 nodes): `update-series.dto.ts`, `UpdateSeriesDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Collection & Series Types`** (2 nodes): `Collection interface`, `CollectionSeries interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (2 nodes): `vite.config.ts`, `spaBypass()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SVG Assets`** (2 nodes): `React Logo`, `Vite Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Config`** (1 nodes): `prisma.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Declarations`** (1 nodes): `types.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Spec Test`** (1 nodes): `auth.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Setup`** (1 nodes): `setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Route Schema`** (1 nodes): `API Routes reference (features.md / API_SCHEMA.md)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GCD Read-Only DB`** (1 nodes): `GCD MySQL (comics_db) - read-only ~3.5M issues`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Library Series View Feature`** (1 nodes): `Library Series View feature (cards + completion tracking)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Sources Feature`** (1 nodes): `Search Sources: GCD, Google Books, Open Library, Tebeosfera, Whakoom`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Favicon`** (1 nodes): `Koma App Favicon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Icon Sprites`** (1 nodes): `UI Icon Sprite Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hero Image`** (1 nodes): `Hero Image - Stacked Layers Illustration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Architecture Docs`** (1 nodes): `Project Directory Structure backend/frontend split`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manual Comic Add`** (1 nodes): `Manual Comic Creation no external DB required`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bulk Selection`** (1 nodes): `Bulk Selection multi-select for Add to Collection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AddToCollectionSheet` transition from STEP 1 to STEP 2 automatically when creating a new collection?**
  _`isNewCollection` flag triggers auto-advance after `POST /collections`; the returned `series.name` ("Principal") is pre-filled in an editable input in STEP 2. High betweenness centrality: this component bridges `ComicDetailPage`, `LibraryPage`, `CollectionsService`, `CollectionSeriesService`, and `UserComicsService`._
- **How does the series-rename flow work atomically for new collections?**
  _STEP 2 collects `editingSeriesName`. On confirm, if non-empty, `PATCH /collections/:collectionId/series/:id` fires before `POST /my-library/to-collection`. The sequence is synchronous (`await`), so the rename is committed before comics are linked._
- **What connects `ComicDetailPage` and `LibraryPage` to the same modal component?**
  _Both render `AddToCollectionSheet` with a different `mode` prop (`single` vs `multiple`) and a `selectedComicIds` array. Unified component eliminates duplication — state, wizard steps, and API calls are shared._
- **Why does `IsbndbService` connect `ISBNdb Service` to `AI Recommendations Module`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `IsbndbController` connect `ISBNdb Controller` to `AI Recommendations Module`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `AuthModule`, `ComicsModule`, `UserComicsModule` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Feature Components` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `App Flow Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `AI Recommendations Module` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Auth Module (JWT + Google OAuth)` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._