import { apiRequest } from './client'

export interface FcmTokenResponse {
  fcmId: number
  userId: number
  token: string
  updatedAt: string
}

export function registerFcmToken(token: string) {
  return apiRequest<FcmTokenResponse>('/api/users/me/fcm-token', {
    method: 'PUT',
    body: { token },
  })
}

export function deleteFcmToken(token: string) {
  return apiRequest<{ deleted: boolean }>('/api/users/me/fcm-token', {
    method: 'DELETE',
    body: { token },
  })
}
