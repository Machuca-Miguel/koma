import { api } from './client'

export interface SeriesSummary {
  id: string
  name: string
  publisher?: string
  yearBegan?: number
  yearEnded?: number
  coverUrl?: string
  isOngoing: boolean
  totalIssues?: number
  comicCount: number
}

export const seriesApi = {
  getAll: (params?: { q?: string }) =>
    api.get<SeriesSummary[]>('/series', { params }).then((r) => r.data),

  create: (data: { name: string; publisher?: string; yearBegan?: number; yearEnded?: number; coverUrl?: string; totalIssues?: number }) =>
    api.post<SeriesSummary>('/series', data).then((r) => r.data),

  update: (id: string, data: { name?: string; publisher?: string; yearBegan?: number; yearEnded?: number; coverUrl?: string; totalIssues?: number; isOngoing?: boolean }) =>
    api.patch<SeriesSummary>(`/series/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/series/${id}`).then((r) => r.data),
}
