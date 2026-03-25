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
}

export type CollectionStatus = 'OWNED' | 'READ' | 'WISHLIST' | 'FAVORITE'

export interface UserComic {
  id: string
  status: CollectionStatus
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
  createdAt: string
  userId: string
  _count?: { comics: number }
}

export interface CollectionComic {
  collectionId: string
  comicId: string
  addedAt: string
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

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
