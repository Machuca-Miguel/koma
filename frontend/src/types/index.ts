// ─── Auth ──────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
  language: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

// ─── Comics ────────────────────────────────────────────────────────────────

export interface Tag {
  id: string
  name: string
  slug: string
}

export type BindingFormat = 'CARTONE' | 'TAPA_BLANDA' | 'BOLSILLO' | 'OMNIBUS' | 'HARDCOVER' | 'SOFTCOVER' | 'DIGITAL' | 'OTHER'

export interface Comic {
  id: string
  title: string
  issueNumber?: string
  publisher?: string
  year?: number
  synopsis?: string
  coverUrl?: string
  createdAt: string
  tags?: { tag: Tag }[]
  // Campos de coleccionista
  isbn?: string
  binding?: BindingFormat
  drawingStyle?: string
  authors?: string
  scriptwriter?: string
  artist?: string
  // null = importado desde ISBNdb; userId = creado manualmente por ese usuario
  createdBy?: string | null
}

// ─── Enums de estado UserComic ─────────────────────────────────────────────

// Group 1: Ownership status (mutually exclusive)
export type CollectionStatusValue = 'IN_COLLECTION' | 'WISHLIST' | 'LOANED'

// Group 2: Reading status (mutually exclusive)
export type ReadStatusValue = 'READ' | 'READING' | 'TO_READ'

// Group 3: Sale/marketplace status (mutually exclusive)
// SOLD implies collectionStatus = null
export type SaleStatusValue = 'FOR_SALE' | 'TO_SELL' | 'SOLD'

export type LibraryFilter =
  | 'IN_COLLECTION' | 'WISHLIST' | 'LOANED'
  | 'READ' | 'READING' | 'TO_READ'
  | 'FOR_SALE' | 'TO_SELL' | 'SOLD'
  | 'ALL'

export type SortBy = 'series_asc' | 'title_asc' | 'year_asc' | 'added_desc' | 'rating_desc'

export interface UserComic {
  id: string
  collectionStatus: CollectionStatusValue | null
  readStatus: ReadStatusValue | null
  saleStatus: SaleStatusValue | null
  loanedTo?: string | null
  rating?: number | null
  notes?: string | null
  addedAt: string
  seriesPosition?: number | null
  // Serie a la que el usuario asignó este cómic (per-user)
  collectionSeriesId?: string | null
  collectionSeries?: CollectionSeries | null
  comic: Comic
  // Overrides por usuario (no-creadores): se aplican sobre el canónico al mostrar datos
  titleOverride?: string | null
  issueNumberOverride?: string | null
  publisherOverride?: string | null
  yearOverride?: number | null
  synopsisOverride?: string | null
  coverUrlOverride?: string | null
  bindingOverride?: BindingFormat | null
  drawingStyleOverride?: string | null
  authorsOverride?: string | null
  scriptwriterOverride?: string | null
  artistOverride?: string | null
}

// ─── CollectionSeries ──────────────────────────────────────────────────────

export interface CollectionSeries {
  id: string
  name: string
  isDefault: boolean
  position: number
  totalVolumes?: number | null
  collectionId: string
  createdAt: string
  _count?: { comics: number }
}

// ─── Collections ───────────────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  description?: string
  isPublic: boolean
  totalVolumes?: number | null
  rating?: number | null
  createdAt: string
  userId: string
  yearRange?: { min: number; max: number } | null
  previewCovers?: string[]
  _count?: { comics: number; series?: number }
}

export interface CollectionComicUserStatus {
  collectionStatus: CollectionStatusValue | null
  readStatus: ReadStatusValue | null
  saleStatus: SaleStatusValue | null
  loanedTo?: string | null
  rating?: number | null
}

// Respuesta del endpoint GET /collections/:id/comics
// comic incluye collectionSeriesId/Series del UserComic del usuario autenticado
export interface CollectionComic {
  comic: Comic & {
    collectionSeriesId?: string | null
    collectionSeries?: CollectionSeries | null
  }
  userStatus?: CollectionComicUserStatus | null
}

export interface CollectionSuggestion {
  comicId: string
  score: number
  comic: Comic
}

// ─── Library Series View ───────────────────────────────────────────────────

export interface UserSeriesSummary {
  collectionSeriesId: string | null
  seriesName: string
  collectionId: string | null
  collectionName: string | null
  isDefault: boolean
  coverUrl: string | null
  totalCount: number | null
  ownedCount: number
  comicCount: number
  comics: UserComic[]
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
