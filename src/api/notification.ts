import { apiRequest } from './client'

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'CHAT_MENTION'
  | 'NOTICE'
  | 'PEER_EVALUATION_STARTED'
  | 'REPORT_PUBLISHED'

export interface NotificationResponse {
  notificationId: number
  type: NotificationType
  content: string
  projectId: number
  projectName: string
  /** 타입별로 가리키는 대상이 다르다(공지=postId 등). 피어평가처럼 대상이 없으면 null로 온다. */
  resourceId: number | null
  isRead: boolean
  createdAt: string
}

/**
 * 알림을 눌렀을 때 이동할 경로. 알림 센터·포그라운드 배너·서비스워커 세 곳이 같은 규칙을 써야
 * 어디서 누르든 같은 화면으로 가므로 여기 한 곳에서만 정의한다.
 *
 * type을 모르는 경우(서버가 새 타입을 추가했거나, FCM data에 type이 실려 오지 않는 경우)에는
 * 기존 동작대로 채팅방으로 보낸다. 지금 발송되는 알림 대부분이 채팅이라 이게 가장 덜 틀린다.
 */
export function resolveNotificationPath(
  type: string | undefined,
  projectId: string | number,
  _resourceId?: string | number | null
): string {
  const base = `/project/${projectId}`
  switch (type) {
    case 'PEER_EVALUATION_STARTED':
      return `${base}/peer-eval`
    case 'REPORT_PUBLISHED':
      return `${base}/report/team`
    case 'NOTICE':
      return `${base}/notices`
    default:
      return `${base}/chat`
  }
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

// 응답 본문은 쓰지 않는다. 화면은 이미 로컬 상태를 갱신하고, 정확한 값은 다음 조회에서 맞춰진다.
export function markNotificationAsRead(notificationId: number) {
  return apiRequest<unknown>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
}

export function markAllNotificationsAsRead() {
  return apiRequest<unknown>('/api/notifications/read-all', { method: 'PATCH' })
}
