# Graph Report - .  (2026-04-12)

## Corpus Check
- 123 files · ~66,875 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 633 edges · 28 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `IsbndbService` - 18 edges
2. `IsbndbController` - 16 edges
3. `CollectionsService` - 14 edges
4. `CollectionsController` - 13 edges
5. `UserComicsController` - 12 edges
6. `ComicsController` - 11 edges
7. `ComicsService` - 11 edges
8. `UsersService` - 10 edges
9. `AppModule (NestJS Root)` - 9 edges
10. `AuthController` - 7 edges

## Surprising Connections (you probably didn't know these)
- `discoverApi (frontend AI recommendations client)` --calls--> `AiModule`  [INFERRED]
  frontend/src/api/discover.ts → backend/src/app.module.ts
- `seriesApi (frontend series CRUD client)` --calls--> `SeriesController`  [INFERRED]
  frontend/src/api/series.ts → backend/src/series/series.controller.ts
- `getSeriesView() - library grouped by series` --shares_data_with--> `UserSeriesSummary interface (library series view)`  [INFERRED]
  backend/src/user-comics/user-comics.service.ts → frontend/src/types/index.ts
- `SeriesController` --semantically_similar_to--> `SeriesService`  [INFERRED] [semantically similar]
  backend/src/series/series.controller.ts → backend/src/series/series.service.ts
- `SearchBooksDto (ISBNdb search params)` --implements--> `IsbndbModule`  [INFERRED]
  backend/src/isbndb/dto/search-books.dto.ts → backend/src/app.module.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (4): handleClose(), handleConfirm(), exitSelecting(), handleAddToCollection()

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (13): AuthController, AuthModule, AuthService, GoogleAuthGuard, GoogleStrategy, JwtStrategy, LocalAuthGuard, LocalStrategy (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (10): AddComicDto, AiController, AiModule, AiService, JwtAuthGuard, UpdateUserComicDto, AddByIsbnDto, BulkDeleteDto (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (5): CollectionsController, CollectionsModule, CreateCollectionDto, PrismaService, UpdateCollectionDto

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (28): AiModule, AppModule (NestJS Root), AuthModule, CollectionSeriesModule, CollectionsModule, ComicsModule, IsbndbModule, PrismaModule (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (6): BulkIsbnDto, ImportIsbndbDto, IsbndbController, IsbndbModule, SearchCommonDto, SearchQueryDto

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (5): ComicsController, ComicsModule, CreateComicDto, QueryComicDto, UpdateComicDto

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (5): CollectionSeriesController, CollectionSeriesModule, CollectionSeriesService, PrismaModule, SeriesModule

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (1): IsbndbService

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (3): hslToHex(), titleToColor(), titleToColorAlpha()

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (1): CollectionsService

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (1): ComicsService

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (1): UsersService

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (2): AppController, AppService

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (2): getYearRange(), PublisherGroupCard()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (1): CreateSeriesDto

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): UpdateSeriesDto

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): Collection interface, CollectionSeries interface

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **47 isolated node(s):** `AuthModule`, `ComicsModule`, `UserComicsModule`, `CollectionsModule`, `CollectionSeriesModule` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (2 nodes): `test-tebeosfera.js`, `test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `create-series.dto.ts`, `CreateSeriesDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `update-series.dto.ts`, `UpdateSeriesDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `Collection interface`, `CollectionSeries interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `prisma.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `app.e2e-spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `types.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `auth.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IsbndbService` connect `Community 8` to `Community 5`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `CollectionsService` connect `Community 11` to `Community 3`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `AuthModule`, `ComicsModule`, `UserComicsModule` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._