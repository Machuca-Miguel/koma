import { api } from './client'
import type { AuthResponse } from '@/types'

export const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/google`

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
}
