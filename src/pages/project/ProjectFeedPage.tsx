import { FolderOpen, Plus, SquarePen, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { fetchPostFeed } from '../../api/postApi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PostFeedItem } from '../../components/post/PostFeedItem'
import type { PostListItemViewModel } from '../../types/post'

const FEED_PAGE_SIZE = 20

export default function ProjectFeedPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isWriteMenuOpen, setIsWriteMenuOpen] = useState(false)
  const [notice, setNotice] = useState<PostListItemViewModel | null>(null)
  const [posts, setPosts] = useState<PostListItemViewModel[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [initialError, setInitialError] = useState<string>()
  const [nextPageError, setNextPageError] = useState<string>()
  const requestGenerationRef = useRef(0)
  const loadingMoreRef = useRef(false)

  const numericProjectId =
    projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
      ? Number(projectId)
      : null

  const loadFirstPage = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current
    loadingMoreRef.current = false
    setNotice(null)
    setPosts([])
    setNextCursor(null)
    setHasNext(false)
    setIsLoading(true)
    setIsLoadingMore(false)
    setInitialError(undefined)
    setNextPageError(undefined)

    if (numericProjectId === null) {
      setInitialError('올바른 프로젝트 경로가 아니어서 피드를 불러올 수 없습니다.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetchPostFeed(numericProjectId, {
        size: FEED_PAGE_SIZE,
      })
      if (requestGeneration !== requestGenerationRef.current) return

      setNotice(response.notice)
      setPosts(response.posts)
      setNextCursor(response.nextCursor)
      setHasNext(response.hasNext)
    } catch (error: unknown) {
      if (requestGeneration !== requestGenerationRef.current) return
      setInitialError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setIsLoading(false)
      }
    }
  }, [numericProjectId])

  useEffect(() => {
    void loadFirstPage()
    return () => {
      requestGenerationRef.current += 1
      loadingMoreRef.current = false
    }
  }, [loadFirstPage])

  const loadNextPage = async () => {
    if (
      numericProjectId === null ||
      !hasNext ||
      !nextCursor ||
      loadingMoreRef.current
    ) {
      return
    }

    const requestGeneration = requestGenerationRef.current
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    setNextPageError(undefined)

    try {
      const response = await fetchPostFeed(numericProjectId, {
        cursor: nextCursor,
        size: FEED_PAGE_SIZE,
      })
      if (requestGeneration !== requestGenerationRef.current) return

      setNotice(response.notice)
      setPosts((current) => [...current, ...response.posts])
      setNextCursor(response.nextCursor)
      setHasNext(response.hasNext)
    } catch (error: unknown) {
      if (requestGeneration !== requestGenerationRef.current) return
      setNextPageError(
        error instanceof ApiError
          ? error.message
          : '다음 게시글을 불러오지 못했습니다.'
      )
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        loadingMoreRef.current = false
        setIsLoadingMore(false)
      }
    }
  }

  const closeWriteMenu = () => setIsWriteMenuOpen(false)

  const handleCreateNotice = () => {
    closeWriteMenu()
    if (projectId) navigate(`/project/${projectId}/notices/new`)
  }

  const handleCreatePost = () => {
    closeWriteMenu()
    if (projectId) navigate(`/project/${projectId}/posts/new`)
  }

  const isFeedEmpty = notice === null && posts.length === 0

  return (
    <div className="relative flex min-h-[calc(100svh-theme(spacing.12)-theme(spacing.10))] overflow-hidden whitespace-pre-line bg-gray-25">
      {isLoading ? (
        <div
          className="flex min-h-[320px] w-full items-center justify-center"
          role="status"
          aria-label="게시글 피드 불러오는 중"
        >
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        </div>
      ) : initialError ? (
        <EmptyState
          icon={<FolderOpen size={48} aria-hidden="true" />}
          title="게시글을 불러오지 못했어요"
          description={initialError}
          action={
            <Button
              type="button"
              fullWidth={false}
              onClick={() => void loadFirstPage()}
            >
              다시 시도
            </Button>
          }
        />
      ) : isFeedEmpty ? (
        <EmptyState
          title="아직 게시글이 없어요"
          description={'첫 게시물이나 공지를 작성해\n팀원들과 진행 상황을 공유해보세요'}
        />
      ) : (
        <div className="w-full px-4 py-4">
          {notice && (
            <button
              type="button"
              onClick={() =>
                navigate(`/project/${notice.projectId}/notices/${notice.postId}`)
              }
              className="flex w-full items-center gap-2 rounded-md bg-blue-50 px-3 py-2.5 text-left text-body-sm text-blue-600 hover:bg-blue-100"
            >
              <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
              <p className="min-w-0 truncate">
                <span className="font-semibold">[공지]</span> {notice.title}
              </p>
            </button>
          )}

          {posts.length > 0 && (
            <div className="mt-4 space-y-4">
              {posts.map((post, index) => (
                <PostFeedItem
                  key={`${post.postId}-${index}`}
                  post={post}
                  onClick={() =>
                    navigate(`/project/${post.projectId}/posts/${post.postId}`)
                  }
                />
              ))}
            </div>
          )}

          {(hasNext || isLoadingMore || nextPageError) && (
            <div className="mt-5 flex flex-col items-center gap-2 pb-20">
              {nextPageError && (
                <p className="text-center text-caption font-normal text-error">
                  {nextPageError}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth={false}
                loading={isLoadingMore}
                disabled={!hasNext || !nextCursor}
                onClick={() => void loadNextPage()}
              >
                {nextPageError ? '다시 시도' : '더보기'}
              </Button>
            </div>
          )}
        </div>
      )}

      {isWriteMenuOpen && (
        <button
          type="button"
          aria-label="작성 메뉴 닫기"
          onClick={closeWriteMenu}
          className="fixed inset-y-0 left-1/2 z-10 w-full max-w-mobile -translate-x-1/2 bg-gray-900/30"
        />
      )}

      {isWriteMenuOpen && (
        <div className="absolute bottom-20 right-4 z-20 overflow-hidden rounded-lg bg-white shadow-lg">
          <button
            type="button"
            onClick={handleCreatePost}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
          >
            <SquarePen
              className="h-5 w-5 text-primary stroke-primary [&>path:nth-of-type(2)]:fill-current"
              aria-hidden
            />
            게시글 작성
          </button>
          <button
            type="button"
            onClick={handleCreateNotice}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
          >
            <Volume2 className="h-5 w-5 text-primary" aria-hidden />
            공지 작성
          </button>
        </div>
      )}

      <Button
        type="button"
        fullWidth={false}
        aria-label={isWriteMenuOpen ? '작성 메뉴 닫기' : '작성 메뉴 열기'}
        onClick={() => setIsWriteMenuOpen((isOpen) => !isOpen)}
        className="absolute bottom-4 right-4 z-20 h-12 w-12 rounded-full p-0 text-white shadow-md"
      >
        {isWriteMenuOpen ? (
          <X className="h-6 w-6 text-white" aria-hidden />
        ) : (
          <Plus className="h-6 w-6 text-white" aria-hidden />
        )}
      </Button>
    </div>
  )
}
