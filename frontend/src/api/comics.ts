import { api } from './client'
import type { Comic, BindingFormat } from '@/types'

export interface ComicTag {
  id: string
  name: string
  slug: string
}

export const comicsApi = {
  getOne: (comicId: string) =>
    api.get<Comic>(`/comics/${comicId}`).then((r) => r.data),

  findByIsbn: (isbn: string) =>
    api.get<{ data: Comic[]; total: number }>('/comics', { params: { isbn } }).then((r) => r.data),

  create: (data: {
    title: string
    issueNumber?: string
    publisher?: string
    year?: number
    synopsis?: string
    coverUrl?: string
    isbn?: string
    binding?: BindingFormat
    drawingStyle?: string
    series?: string
    authors?: string
    scriptwriter?: string
    artist?: string
    collectionSeriesId?: string
  }) => api.post<Comic>('/comics', data).then((r) => r.data),

  update: (comicId: string, data: {
    title?: string
    issueNumber?: string
    publisher?: string
    year?: number
    synopsis?: string
    coverUrl?: string
    binding?: BindingFormat | null
    drawingStyle?: string
    authors?: string
    scriptwriter?: string
    artist?: string
  }) => api.patch<Comic>(`/comics/${comicId}`, data).then((r) => r.data),

  getTags: () =>
    api.get<ComicTag[]>('/comics/tags/user').then((r) => r.data),

  addTag: (comicId: string, name: string) =>
    api.post<Comic>(`/comics/${comicId}/tags`, { name }).then((r) => r.data),

  removeTag: (comicId: string, tagId: string) =>
    api.delete<Comic>(`/comics/${comicId}/tags/${tagId}`).then((r) => r.data),
}
