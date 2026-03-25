import { api } from './client'
import type { Comic } from '@/types'

export const comicsApi = {
  getOne: (comicId: string) =>
    api.get<Comic>(`/comics/${comicId}`).then((r) => r.data),

  create: (data: {
    title: string
    issueNumber?: string
    publisher?: string
    year?: number
    synopsis?: string
    coverUrl?: string
  }) => api.post<Comic>('/comics', data).then((r) => r.data),
}
