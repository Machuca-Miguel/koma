import { api } from './client'
import type { UserComic, UserSeriesSummary, LibraryFilter, SortBy, PaginatedResponse } from '@/types'

export const libraryApi = {
  getAll: (params?: { status?: LibraryFilter; sortBy?: SortBy; page?: number; limit?: number; q?: string; searchBy?: 'title' | 'author' | 'publisher'; tag?: string; publisher?: string; yearFrom?: number; yearTo?: number }) =>
    api.get<PaginatedResponse<UserComic>>('/my-library', { params }).then((r) => r.data),

  getStats: () =>
    api.get<{
      total: number
      byStatus: { OWNED: number; READ: number; WISHLIST: number; FAVORITE: number }
      loaned: number
      totalRated: number
      averageRating: number | null
    }>('/my-library/stats').then((r) => r.data),

  add: (data: {
    comicId: string
    isOwned?: boolean
    isRead?: boolean
    isWishlist?: boolean
    isFavorite?: boolean
    rating?: number
    notes?: string
  }) =>
    api.post<UserComic>('/my-library', data).then((r) => r.data),

  update: (comicId: string, data: {
    isOwned?: boolean
    isRead?: boolean
    isWishlist?: boolean
    isFavorite?: boolean
    isLoaned?: boolean
    loanedTo?: string
    rating?: number
    notes?: string
  }) =>
    api.patch<UserComic>(`/my-library/${comicId}`, data).then((r) => r.data),

  remove: (comicId: string) =>
    api.delete(`/my-library/${comicId}`).then((r) => r.data),

  removeBulk: (comicIds: string[]) =>
    api.delete<{ deleted: number }>('/my-library/bulk', { data: { comicIds } }).then((r) => r.data),

  getByComicId: (comicId: string) =>
    api.get<UserComic | null>(`/my-library/comic/${comicId}`).then((r) => r.data),

  export: (format: 'csv' | 'json') =>
    api.get<Blob>('/my-library/export', { params: { format }, responseType: 'blob' }),

  getSeriesView: (params?: { status?: LibraryFilter; q?: string }) =>
    api.get<UserSeriesSummary[]>('/my-library/series-view', { params }).then((r) => r.data),
}
