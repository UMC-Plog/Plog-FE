import {
  AtSign,
  Bell,
  ChevronRight,
  FileBarChart,
  Megaphone,
  MessageCircle,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resolveNotificationPath,
  type NotificationResponse,
  type NotificationType,
} from '../api/notification'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Layout } from '../components/Layout'
import { MySubpageHeader } from '../components/my/MySubpageHeader'
import { cn } from '../lib/utils'
import { useNotificationBadgeStore } from '../store/notificationBadgeStore'

const PAGE_SIZE = 20

// 목록에서 알림 종류를 한눈에 구분할 수 있도록 타입별 아이콘을 쓴다.
// 모르는 타입이 와도 깨지지 않게 기본값을 둔다.
const NOTIFICATION_ICON: Record<NotificationType, typeof MessageCircle> = {
  CHAT_MESSAGE: MessageCircle,
  CHAT_MENTION: AtSign,
  NOTICE: Megaphone,
  PEER_EVALUATION_STARTED: Star,
  REPORT_PUBLISHED: FileBarChart,
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export default function NotificationPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  // 읽음 처리 후 홈 벨 아이콘의 빨간 점도 같이 갱신해야, 목록은 읽음인데 벨만 남는 상황을 막는다.
  const refreshBadge = useNotificationBadgeStore((state) => state.refresh)
  const hasUnread = notifications.some((notification) => !notification.isRead)

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetchNotifications({ page: nextPage, size: PAGE_SIZE })
      setNotifications((current) =>
        append ? [...current, ...response.content] : response.content,
      )
      setPage(response.page)
      setHasNext(response.hasNext)
    } catch {
      setError('알림을 불러오지 못했어요. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(0, false)
  }, [loadPage])

  useEffect(() => {
    const refresh = () => void loadPage(0, false)
    window.addEventListener('plog:notification-received', refresh)
    return () => window.removeEventListener('plog:notification-received', refresh)
  }, [loadPage])

  // 목록에 들어온 것만으로는 읽음 처리하지 않는다. 이 앱의 알림은 대부분 할 일에 가까워
  // (멘션 확인, 평가하러 가기 등) 훑어보기만 해도 지워지면 무엇을 안 봤는지 알 수 없어진다.
  // 여러 프로젝트 알림이 최신순으로 섞여 쌓이는 것도 이유다. 한꺼번에 지우려면 "모두 읽음"을 쓴다.
  const handleNotificationClick = (notification: NotificationResponse) => {
    if (!notification.isRead) {
      setNotifications((current) =>
        current.map((item) =>
          item.notificationId === notification.notificationId ? { ...item, isRead: true } : item,
        ),
      )
      // 배지 갱신은 안 읽은 알림을 찾을 때까지 목록을 훑으므로 클릭마다 부르면 낭비다.
      // 화면에 안 읽은 알림이 남아 있으면 배지는 어차피 그대로여서 갱신할 필요가 없고,
      // 이번 클릭으로 다 읽음이 됐을 때만 확인한다.
      const wasLastUnread = !notifications.some(
        (item) => !item.isRead && item.notificationId !== notification.notificationId,
      )
      // 이동을 막지 않도록 응답을 기다리지 않는다. 실패해도 다음 조회에서 원래 상태로 돌아온다.
      void markNotificationAsRead(notification.notificationId)
        .then(() => {
          if (wasLastUnread) void refreshBadge()
        })
        .catch(() => undefined)
    }

    navigate(
      resolveNotificationPath(notification.type, notification.projectId, notification.resourceId)
    )
  }

  const handleMarkAllAsRead = async () => {
    if (markingAll || !hasUnread) return
    setMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      void refreshBadge()
    } catch {
      setError('읽음 처리에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <Layout className="min-h-svh bg-gray-25">
      <MySubpageHeader title="알림" onBack={() => navigate(-1)} />

      <main className="flex-1 px-[22px] py-5">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center" role="status" aria-label="알림 불러오는 중">
            <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
          </div>
        ) : error && notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={48} aria-hidden="true" />}
            title="알림을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요"
            action={
              <Button type="button" fullWidth={false} onClick={() => void loadPage(0, false)}>
                다시 시도
              </Button>
            }
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={48} aria-hidden="true" />}
            title="아직 알림이 없어요"
            description="새로운 소식이 생기면 여기에 알려드릴게요"
          />
        ) : (
          <>
            {/* 관심 없는 알림을 계속 안 누르면 벨의 빨간 점이 사라지지 않으므로 한 번에 정리할 길을 둔다 */}
            {hasUnread && (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  disabled={markingAll}
                  className="text-[13px] leading-5 text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-700 disabled:text-gray-300"
                >
                  {markingAll ? '처리 중...' : '모두 읽음'}
                </button>
              </div>
            )}

            <ul className="space-y-3" aria-label="알림 목록">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICON[notification.type] ?? MessageCircle
                return (
                <li key={notification.notificationId}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition-colors',
                      notification.isRead
                        ? 'border-gray-100 bg-white'
                        : 'border-blue-100 bg-blue-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                        notification.isRead
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-blue-100 text-blue-500',
                      )}
                    >
                      <Icon size={21} aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold leading-5 text-gray-900">
                          {notification.projectName}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="읽지 않음" />
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[13px] leading-[19px] text-gray-600">
                        {notification.content}
                      </span>
                      <span className="mt-1.5 block text-[11px] leading-4 text-gray-400">
                        {formatCreatedAt(notification.createdAt)}
                      </span>
                    </span>

                    <ChevronRight size={18} className="shrink-0 text-gray-300" aria-hidden="true" />
                  </button>
                </li>
                )
              })}
            </ul>

            {error && (
              <p className="mt-4 text-center text-[12px] text-error" role="alert">
                {error}
              </p>
            )}

            {hasNext && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadPage(page + 1, true)}
                className="mt-5 h-12 w-full rounded-xl border border-gray-200 bg-white text-[14px] font-medium text-gray-600 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {loadingMore ? '불러오는 중...' : '알림 더 보기'}
              </button>
            )}
          </>
        )}
      </main>
    </Layout>
  )
}
