// ─── Auth ──────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

// ─── Comics ────────────────────────────────────────────────────────────────

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
}

// ─── External API ──────────────────────────────────────────────────────────

export type ExternalSource = 'comic_vine' | 'metron'

export interface ExternalComic {
  externalId: string
  externalApi: ExternalSource
  title: string
  issueNumber?: string
  publisher?: string
  year?: number
  synopsis?: string
  coverUrl?: string
}

export interface ExternalSearchResult {
  data: ExternalComic[]
  total: number
  page: number
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
