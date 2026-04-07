import { api } from './client'

export interface SeriesIssue {
  gcdId: string
  issueNumber: string | null
  title: string | null
  year: number | null
  isOwned: boolean
}

export interface SeriesCompletion {
  seriesName: string | null
  total: number
  owned: number
  issues: SeriesIssue[]
}

export interface Recommendation {
  title: string
  author: string
  why: string
}

export const discoverApi = {
  getSeriesCompletion: (issueId: string) =>
    api.get<SeriesCompletion>('/gcd/series-completion', { params: { issueId } }).then((r) => r.data),

  getSeriesCompletionBySeriesId: (gcdSeriesId: number) =>
    api.get<SeriesCompletion>(`/gcd/series/${gcdSeriesId}/completion`).then((r) => r.data),

  getRecommendations: () =>
    api.post<Recommendation[]>('/ai/recommend').then((r) => r.data),
}
