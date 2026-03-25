import { api } from './client'
import type { User } from '@/types'

export const usersApi = {
  getMe: () => api.get<User>('/users/me').then((r) => r.data),

  updateProfile: (data: { username?: string; language?: string }) =>
    api.patch<User>('/users/me', data).then((r) => r.data),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<void>('/users/me/password', data),
}
