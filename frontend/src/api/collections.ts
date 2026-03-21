import { api } from './client'
import type { Collection } from '@/types'

export const collectionsApi = {
  getAll: () =>
    api.get<Collection[]>('/collections').then((r) => r.data),

  create: (data: { name: string; description?: string; isPublic?: boolean }) =>
    api.post<Collection>('/collections', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string; isPublic?: boolean }) =>
    api.patch<Collection>(`/collections/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/collections/${id}`).then((r) => r.data),
}
