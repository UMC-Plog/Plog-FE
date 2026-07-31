import { Bell, ChevronRight, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNotifications,
  type NotificationResponse,
} from '../api/notification'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Layout } from '../components/Layout'
import { MySubpageHeader } from '../components/my/MySubpageHeader'
import { cn } from '../lib/utils'

const PAGE_SIZE = 20

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

  const handleNotificationClick = (notification: NotificationResponse) => {
    if (notification.type === 'CHAT_MENTION') {
      navigate(`/project/${notification.projectId}/chat`)
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
            <ul className="space-y-3" aria-label="알림 목록">
              {notifications.map((notification) => (
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
                      <MessageCircle size={21} aria-hidden="true" />
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
              ))}
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
