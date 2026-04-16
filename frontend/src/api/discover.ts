import { api } from './client'

export interface Recommendation {
  title: string
  author: string
  why: string
}

export const discoverApi = {
  getRecommendations: () =>
    api.post<Recommendation[]>('/ai/recommend').then((r) => r.data),
}
