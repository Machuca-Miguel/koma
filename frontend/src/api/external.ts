import { api } from './client'
import type { ExternalSearchResult, Comic, ExternalSource } from '@/types'

export const externalApi = {
  search: (params: { q: string; source: ExternalSource; page?: number }) =>
    api.get<ExternalSearchResult>('/external-comics/search', { params }).then((r) => r.data),

  import: (data: { externalId: string; source: ExternalSource }) =>
    api.post<{ comic: Comic; imported: boolean }>('/external-comics/import', data).then((r) => r.data),
}
