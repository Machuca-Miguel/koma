import { api } from './client'
import type { CollectionSeries } from '@/types'

export const collectionSeriesApi = {
  getByCollection: (collectionId: string) =>
    api.get<CollectionSeries[]>(`/collections/${collectionId}/series`).then((r) => r.data),

  create: (collectionId: string, name: string) =>
    api.post<CollectionSeries>(`/collections/${collectionId}/series`, { name }).then((r) => r.data),

  update: (collectionId: string, id: string, data: { name?: string; totalVolumes?: number | null }) =>
    api.patch<CollectionSeries>(`/collections/${collectionId}/series/${id}`, data).then((r) => r.data),

  remove: (collectionId: string, id: string) =>
    api.delete(`/collections/${collectionId}/series/${id}`).then((r) => r.data),
}
