import { api } from './client'
import type { Collection, CollectionComic } from '@/types'

export const collectionsApi = {
  getAll: () =>
    api.get<Collection[]>('/collections').then((r) => r.data),

  create: (data: { name: string; description?: string; isPublic?: boolean }) =>
    api.post<Collection>('/collections', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string; isPublic?: boolean }) =>
    api.patch<Collection>(`/collections/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/collections/${id}`).then((r) => r.data),

  getComics: (collectionId: string) =>
    api.get<CollectionComic[]>(`/collections/${collectionId}/comics`).then((r) => r.data),

  addComic: (collectionId: string, comicId: string) =>
    api.post<CollectionComic>(`/collections/${collectionId}/comics`, { comicId }).then((r) => r.data),

  removeComic: (collectionId: string, comicId: string) =>
    api.delete(`/collections/${collectionId}/comics/${comicId}`).then((r) => r.data),
}
