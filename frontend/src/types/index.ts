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

export type BindingFormat = 'CARTONE' | 'TAPA_BLANDA' | 'BOLSILLO' | 'OMNIBUS' | 'HARDCOVER'

export interface Comic {
  id: string
  title: string
  issueNumber?: string
  publisher?: string
  year?: number
  synopsis?: string
  coverUrl?: string
  externalId?: string
  externalApi?: string
  createdAt: string
  tags?: { tag: Tag }[]
  // Campos de coleccionista
  isbn?: string
  binding?: BindingFormat
  drawingStyle?: string
  series?: string
  seriesId?: string
  authors?: string
}

// Status flags — un cómic puede tener varios a la vez
export interface UserComicStatus {
  isOwned: boolean
  isRead: boolean
  isWishlist: boolean
  isFavorite: boolean
  isLoaned: boolean
  loanedTo?: string
}

export type LibraryFilter = 'OWNED' | 'READ' | 'WISHLIST' | 'FAVORITE' | 'LOANED' | 'ALL'
export type SortBy = 'series_asc' | 'title_asc' | 'year_asc' | 'added_desc' | 'rating_desc'

// Kept for badge display helpers
export type CollectionStatus = 'OWNED' | 'READ' | 'WISHLIST' | 'FAVORITE'

export interface UserComic {
  id: string
  isOwned: boolean
  isRead: boolean
  isWishlist: boolean
  isFavorite: boolean
  isLoaned: boolean
  loanedTo?: string
  rating?: number
  notes?: string
  addedAt: string
  comic: Comic
}

// ─── Collections ───────────────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  description?: string
  isPublic: boolean
  rating?: number | null
  createdAt: string
  userId: string
  yearRange?: { min: number; max: number } | null
  previewCovers?: string[]
  _count?: { comics: number }
}

export interface CollectionComicUserStatus {
  isOwned: boolean
  isRead: boolean
  isWishlist: boolean
  isFavorite: boolean
  isLoaned: boolean
  rating?: number | null
}

export interface CollectionComic {
  collectionId: string
  comicId: string
  addedAt: string
  position?: number | null
  comic: Comic
  userStatus?: CollectionComicUserStatus | null
}

export interface CollectionSuggestion {
  comicId: string
  score: number
  comic: Comic
}

// ─── GCD ───────────────────────────────────────────────────────────────────

export interface GcdComic {
  externalId: string
  title: string
  issueNumber?: string
  publisher?: string
  year?: number
  synopsis?: string
  coverUrl?: string
  isbn?: string
  series?: string
}

export interface GcdSearchResult {
  data: GcdComic[]
  total: number
  page: number
}

export interface GcdCreatorRole {
  role: string
  names: string[]
}

export interface GcdStory {
  title?: string
  type?: string
  pageCount?: number
  synopsis?: string
  genre?: string
  characters?: string
  feature?: string
  firstLine?: string
}

export interface GcdSeriesInfo {
  name: string
  format?: string
  yearBegan?: number
  yearEnded?: number
  issueCount?: number
  publicationDates?: string
  color?: string
  dimensions?: string
  paperStock?: string
  binding?: string
  publishingFormat?: string
}

export interface GcdPublisherInfo {
  name: string
  yearBegan?: number
  yearEnded?: number
  url?: string
}

export interface GcdComicDetail extends GcdComic {
  pageCount?: number
  price?: string
  onSaleDate?: string
  barcode?: string
  isbn?: string
  creators: GcdCreatorRole[]
  stories: GcdStory[]
  seriesInfo?: GcdSeriesInfo
  publisherInfo?: GcdPublisherInfo
}

// ─── GCD Series ────────────────────────────────────────────────────────────

export interface GcdSeriesSummary {
  seriesId: number
  name: string
  publisher?: string
  yearBegan?: number
  yearEnded?: number
  issueCount?: number
}

export interface GcdSeriesSearchResult {
  data: GcdSeriesSummary[]
  total: number
  page: number
}

export interface GcdSeriesCompletion {
  seriesName: string | null
  total: number
  owned: number
  issues: Array<{
    gcdId: string
    issueNumber: string | null
    title: string | null
    year: number | null
    isOwned: boolean
  }>
}

// ─── Library Series View ───────────────────────────────────────────────────

export interface UserSeriesSummary {
  seriesId: string | null
  gcdSeriesId: number | null
  seriesName: string
  publisher: string | null
  coverUrl: string | null
  totalCount: number | null
  isOngoing: boolean | null
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
