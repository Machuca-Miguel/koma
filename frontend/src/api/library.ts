import { api } from './client'
import type { UserComic, UserSeriesSummary, LibraryFilter, SortBy, PaginatedResponse, CollectionStatusValue, ReadStatusValue, SaleStatusValue } from '@/types'

export interface SeriesDetail {
  collectionSeriesId: string
  seriesName: string
  collectionId: string
  collectionName: string
  totalVolumes: number | null
  ownedCount: number
  comicCount: number
  coverUrl: string | null
  publisher: string | null
  comics: UserComic[]
}

export const libraryApi = {
  getAll: (params?: { status?: LibraryFilter; sortBy?: SortBy; page?: number; limit?: number; q?: string; searchBy?: 'title' | 'authors' | 'scriptwriter' | 'artist' | 'publisher'; tag?: string; publisher?: string; yearFrom?: number; yearTo?: number }) =>
    api.get<PaginatedResponse<UserComic>>('/my-library', { params }).then((r) => r.data),

  getStats: () =>
    api.get<{
      total: number
      seriesCount: number
      byStatus: {
        IN_COLLECTION: number
        WISHLIST: number
        LOANED: number
        READ: number
        READING: number
        TO_READ: number
      }
      totalRated: number
      averageRating: number | null
    }>('/my-library/stats').then((r) => r.data),

  add: (data: {
    comicId: string
    collectionStatus?: CollectionStatusValue
    rating?: number
    notes?: string
  }) =>
    api.post<UserComic>('/my-library', data).then((r) => r.data),

  update: (comicId: string, data: {
    collectionStatus?: CollectionStatusValue | null
    readStatus?: ReadStatusValue | null
    saleStatus?: SaleStatusValue | null
    loanedTo?: string
    rating?: number
    notes?: string
    collectionSeriesId?: string | null
    // Override fields for non-creators
    titleOverride?: string | null
    issueNumberOverride?: string | null
    publisherOverride?: string | null
    yearOverride?: number | null
    synopsisOverride?: string | null
    coverUrlOverride?: string | null
    bindingOverride?: string | null
    drawingStyleOverride?: string | null
    authorsOverride?: string | null
    scriptwriterOverride?: string | null
    artistOverride?: string | null
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

  getSeriesDetail: (collectionSeriesId: string) =>
    api.get<SeriesDetail>(`/my-library/series/${collectionSeriesId}`).then((r) => r.data),

  reorderSeries: (collectionSeriesId: string, positions: { comicId: string; position: number }[]) =>
    api.patch<{ updated: number }>(`/my-library/series/${collectionSeriesId}/reorder`, { positions }).then((r) => r.data),

  addMultipleToCollection: (data: { comicIds: string[]; collectionSeriesId: string }) =>
    api.post<{ updated: number }>('/my-library/to-collection', data).then((r) => r.data),

  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ imported: number; skipped: number }>('/my-library/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
