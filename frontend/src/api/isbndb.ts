import { api } from './client'
import type { Comic } from '@/types'

// ─── ISBNDB types (mirroring backend interfaces) ──────────────────────────────

export interface IsbndbBook {
  isbn: string
  isbn13?: string
  title: string
  title_long?: string
  authors?: string[]
  publisher?: string
  date_published?: string
  language?: string
  synopsis?: string
  overview?: string
  image?: string
  pages?: number
  subjects?: string[]
  binding?: string
  msrp?: string | number
  edition?: string
  dimensions?: string
  other_isbns?: { isbn: string; binding: string }[]
}

export interface IsbndbBooksResponse {
  total: number
  books: IsbndbBook[]
  page?: number
}

export interface IsbndbAuthorsResponse {
  total: number
  authors: string[]
  page: number
}

export interface IsbndbAuthorBooksResponse {
  author: string
  books: IsbndbBook[]
  total?: number
}

export interface IsbndbPublishersResponse {
  total: number
  publishers: string[]
  page: number
}

export interface IsbndbPublisherBooksResponse {
  publisher: string
  books: IsbndbBook[]
  total?: number
}

export interface IsbndbSubjectsResponse {
  total: number
  subjects: string[]
  page: number
}

export interface IsbndbSubjectBooksResponse {
  subject: string
  books: IsbndbBook[]
  total?: number
}

export interface IsbndbStatsResponse {
  activeISBNs?: number
  books?: number
  authors?: number
  publishers?: number
  subjects?: number
  [key: string]: unknown
}

export interface IsbndbKeyResponse {
  access_level?: string
  daily_limit?: number
  requests_today?: number
  requests_remaining?: number
  [key: string]: unknown
}

export interface IsbndbFeedResponse {
  total?: number
  page?: number
  books?: IsbndbBook[]
  [key: string]: unknown
}

export type IsbndbSearchColumn = 'title' | 'author' | 'publisher' | 'isbn' | 'subject'

// ─── API client ───────────────────────────────────────────────────────────────

export const isbndbApi = {
  // Books
  searchBooks: (params: {
    q: string
    page?: number
    pageSize?: number
    column?: IsbndbSearchColumn
    language?: string
    year?: number
    edition?: string
    shouldMatchAll?: boolean
  }) =>
    api.get<IsbndbBooksResponse>('/isbndb/books/search', { params }).then((r) => r.data),

  getBook: (isbn: string) =>
    api.get<IsbndbBook>(`/isbndb/book/${isbn}`).then((r) => r.data),

  getBookEditions: (isbn: string) =>
    api.get<IsbndbBooksResponse>(`/isbndb/book/${isbn}/editions`).then((r) => r.data),

  getBooksBulk: (isbns: string[]) =>
    api.post<IsbndbBooksResponse>('/isbndb/books/bulk', { isbns }).then((r) => r.data),

  // Authors
  searchAuthors: (params: { q: string; page?: number; pageSize?: number }) =>
    api.get<IsbndbAuthorsResponse>('/isbndb/authors/search', { params }).then((r) => r.data),

  getAuthorBooks: (name: string, params?: { page?: number; pageSize?: number }) =>
    api
      .get<IsbndbAuthorBooksResponse>(`/isbndb/author/${encodeURIComponent(name)}`, { params })
      .then((r) => r.data),

  // Publishers
  searchPublishers: (params: { q: string; page?: number; pageSize?: number }) =>
    api.get<IsbndbPublishersResponse>('/isbndb/publishers/search', { params }).then((r) => r.data),

  getPublisherBooks: (name: string, params?: { page?: number; pageSize?: number }) =>
    api
      .get<IsbndbPublisherBooksResponse>(`/isbndb/publisher/${encodeURIComponent(name)}`, { params })
      .then((r) => r.data),

  // Subjects
  searchSubjects: (params: { q: string; page?: number; pageSize?: number }) =>
    api.get<IsbndbSubjectsResponse>('/isbndb/subjects/search', { params }).then((r) => r.data),

  getSubjectBooks: (name: string, params?: { page?: number; pageSize?: number }) =>
    api
      .get<IsbndbSubjectBooksResponse>(`/isbndb/subject/${encodeURIComponent(name)}`, { params })
      .then((r) => r.data),

  // Stats & Key
  getStats: () =>
    api.get<IsbndbStatsResponse>('/isbndb/stats').then((r) => r.data),

  getApiKey: () =>
    api.get<IsbndbKeyResponse>('/isbndb/key').then((r) => r.data),

  // Feed (Premium+)
  getFeedUpdates: (params?: { page?: number; pageSize?: number; lastUpdated?: string }) =>
    api.get<IsbndbFeedResponse>('/isbndb/feeds/updates', { params }).then((r) => r.data),

  // Import
  import: (book: IsbndbBook) =>
    api
      .post<{ comic: Comic; imported: boolean }>('/isbndb/import', { book })
      .then((r) => r.data),
}
