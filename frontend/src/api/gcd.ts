import { api } from './client'
import type { GcdSearchResult, GcdComicDetail, GcdSeriesSearchResult, GcdSeriesCompletion, Comic } from '@/types'

export const gcdApi = {
  search: (params: {
    q?: string
    publisher?: string
    creator?: string
    year?: number
    page?: number
  }) => api.get<GcdSearchResult>('/gcd/search', { params }).then((r) => r.data),

  searchSeries: (params: {
    q?: string
    publisher?: string
    year?: number
    page?: number
  }) => api.get<GcdSeriesSearchResult>('/gcd/series-search', { params }).then((r) => r.data),

  getSeriesCompletion: (gcdSeriesId: number) =>
    api.get<GcdSeriesCompletion>(`/gcd/series/${gcdSeriesId}/completion`).then((r) => r.data),

  getDetail: (externalId: string) =>
    api.get<GcdComicDetail>(`/gcd/detail/${externalId}`).then((r) => r.data),

  import: (externalId: string) =>
    api.post<{ comic: Comic; imported: boolean }>('/gcd/import', { externalId }).then((r) => r.data),
}
