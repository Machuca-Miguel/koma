import { api } from './client'
import type { UserComic, CollectionStatus, PaginatedResponse } from '@/types'

export const libraryApi = {
  getAll: (params?: { status?: CollectionStatus; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<UserComic>>('/my-library', { params }).then((r) => r.data),

  getStats: () =>
    api.get<{
      byStatus: Record<CollectionStatus, number>
      totalRated: number
      averageRating: number | null
    }>('/my-library/stats').then((r) => r.data),

  add: (data: { comicId: string; status: CollectionStatus; rating?: number; notes?: string }) =>
    api.post<UserComic>('/my-library', data).then((r) => r.data),

  update: (comicId: string, data: { status?: CollectionStatus; rating?: number; notes?: string }) =>
    api.patch<UserComic>(`/my-library/${comicId}`, data).then((r) => r.data),

  remove: (comicId: string) =>
    api.delete(`/my-library/${comicId}`).then((r) => r.data),

  getByComicId: (comicId: string) =>
    api.get<UserComic | null>(`/my-library/comic/${comicId}`).then((r) => r.data),
}
