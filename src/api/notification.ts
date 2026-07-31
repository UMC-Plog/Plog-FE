import { apiRequest } from './client'

export type NotificationType = 'CHAT_MENTION'

export interface NotificationResponse {
  notificationId: number
  type: NotificationType
  content: string
  projectId: number
  projectName: string
  resourceId: number
  isRead: boolean
  createdAt: string
}

export interface NotificationPageResponse {
  content: NotificationResponse[]
  page: number
  size: number
  hasNext: boolean
}

export function fetchNotifications(params: { page?: number; size?: number } = {}) {
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(params.page ?? 0))
  searchParams.set('size', String(params.size ?? 20))

  return apiRequest<NotificationPageResponse>(`/api/notifications?${searchParams.toString()}`)
}
