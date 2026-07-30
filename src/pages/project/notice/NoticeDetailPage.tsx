import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import { fetchPostDetail } from '../../../api/postApi'
import { Button } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'
import { Layout } from '../../../components/Layout'
import { TopNavBar } from '../../../components/TopNavBar'
import type { PostDetailViewModel } from '../../../types/post'
import { PostAuthorAvatar } from '../../../components/post/PostAuthorAvatar'

function formatNoticeTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt))
}

function parsePositiveSafeInteger(value: string | undefined) {
  return value &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Number(value)
    : null
}

export default function NoticeDetailPage() {
  const { id: projectId, noticeId } = useParams<{
    id: string
    noticeId: string
  }>()
  const navigate = useNavigate()
  const numericProjectId = parsePositiveSafeInteger(projectId)
  const numericPostId = parsePositiveSafeInteger(noticeId)
  const [notice, setNotice] = useState<PostDetailViewModel>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const requestIdRef = useRef(0)

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const loadNotice = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setNotice(undefined)
    setIsLoading(true)
    setError(undefined)

    if (numericProjectId === null || numericPostId === null) {
      setError('올바른 공지 경로가 아니어서 내용을 불러올 수 없습니다.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetchPostDetail(numericProjectId, numericPostId)
      if (requestId !== requestIdRef.current) return
      if (!response.isNotice) {
        throw new ApiError(
          'INVALID_NOTICE_DETAIL_RESPONSE',
          '공지로 지정된 게시글이 아닙니다.'
        )
      }
      setNotice(response)
    } catch (requestError: unknown) {
      if (requestId !== requestIdRef.current) return
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [numericPostId, numericProjectId])

  useEffect(() => {
    void loadNotice()
    return () => {
      requestIdRef.current += 1
    }
  }, [loadNotice])

  if (isLoading) {
    return (
      <Layout>
        <TopNavBar title="공지" onBack={goToFeed} />
        <main
          className="flex flex-1 items-center justify-center"
          role="status"
          aria-label="공지 상세 불러오는 중"
        >
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        </main>
      </Layout>
    )
  }

  if (error || !notice) {
    return (
      <Layout>
        <TopNavBar title="공지" onBack={goToFeed} />
        <EmptyState
          title="공지를 불러오지 못했어요"
          description={error ?? '공지 상세 응답을 확인할 수 없습니다.'}
          action={
            <Button
              type="button"
              fullWidth={false}
              onClick={() => void loadNotice()}
            >
              다시 시도
            </Button>
          }
        />
      </Layout>
    )
  }

  return (
    <Layout>
      <TopNavBar title="공지" onBack={goToFeed} />

      <main className="flex flex-1 flex-col bg-gray-25 px-4 py-5">
        <article>
          <div className="flex items-center gap-3">
            <PostAuthorAvatar profilePreset={notice.profilePreset} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-gray-900">
                {notice.authorNickname ?? '알 수 없는 사용자'}
              </p>
              <p className="text-caption font-normal text-gray-400">
                {formatNoticeTime(notice.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-white p-5 shadow-md">
            <h1 className="text-title font-bold text-gray-900">
              {notice.title}
            </h1>
            <p className="whitespace-pre-wrap break-words text-body-sm text-gray-700">
              {notice.content}
            </p>
          </div>
        </article>
      </main>
    </Layout>
  )
}
