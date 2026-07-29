import { ArrowRight, Ellipsis, FileText, Heart, Link, MessageSquare, UserRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import {
  deletePost as requestDeletePost,
  fetchPostDetail,
  likePost,
  unlikePost,
} from '../../../api/postApi'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { AlertModal } from '../../../components/Modal'
import { TopNavBar } from '../../../components/TopNavBar'
import type { PostDetailViewModel } from '../../../types/post'

function formatPostTime(createdAt: string) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  return `${Math.floor(hours / 24)}일 전`
}

function parsePositiveSafeInteger(value: string | undefined) {
  return value &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Number(value)
    : null
}

export default function PostDetailPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const numericProjectId = parsePositiveSafeInteger(projectId)
  const numericPostId = parsePositiveSafeInteger(postId)
  const [post, setPost] = useState<PostDetailViewModel>()
  const [isLoading, setIsLoading] = useState(true)
  const [detailError, setDetailError] = useState<string>()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [likeError, setLikeError] = useState<string>()
  const menuRef = useRef<HTMLDivElement>(null)
  const deletingRef = useRef(false)
  const likeSubmittingRef = useRef(false)
  const detailRequestRef = useRef(0)

  const loadDetail = useCallback(async () => {
    const requestId = ++detailRequestRef.current
    setPost(undefined)
    setIsLoading(true)
    setDetailError(undefined)
    setIsMenuOpen(false)
    setIsDeleteDialogOpen(false)
    setDeleteError(undefined)
    setLikeError(undefined)
    deletingRef.current = false
    likeSubmittingRef.current = false
    setIsDeleting(false)
    setIsLikeSubmitting(false)

    if (numericProjectId === null || numericPostId === null) {
      setDetailError('올바른 게시글 경로가 아니어서 상세 내용을 불러올 수 없습니다.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetchPostDetail(numericProjectId, numericPostId)
      if (requestId !== detailRequestRef.current) return

      setPost(response)
      setIsLiked(response.likedByMe)
      setLikeCount(response.likeCount)
    } catch (error: unknown) {
      if (requestId !== detailRequestRef.current) return
      setDetailError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
    } finally {
      if (requestId === detailRequestRef.current) setIsLoading(false)
    }
  }, [numericPostId, numericProjectId])

  useEffect(() => {
    void loadDetail()
    return () => {
      detailRequestRef.current += 1
    }
  }, [loadDetail])

  useEffect(() => {
    if (!isMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isMenuOpen])

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const handleEdit = () => {
    setIsMenuOpen(false)
    if (post && projectId && postId) {
      navigate(`/project/${projectId}/posts/${postId}/edit`)
    }
  }

  const handleDelete = () => {
    if (!post) return
    setIsMenuOpen(false)
    setDeleteError(undefined)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (
      !post ||
      numericProjectId === null ||
      numericPostId === null ||
      deletingRef.current
    ) {
      return
    }

    deletingRef.current = true
    setIsDeleting(true)
    setDeleteError(undefined)

    try {
      await requestDeletePost(numericProjectId, numericPostId)
      navigate(`/project/${numericProjectId}/feed`, { replace: true })
    } catch (error: unknown) {
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
      deletingRef.current = false
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    if (deletingRef.current) return
    setDeleteError(undefined)
    setIsDeleteDialogOpen(false)
  }

  const handleLike = async () => {
    if (
      !post ||
      numericProjectId === null ||
      numericPostId === null ||
      likeSubmittingRef.current
    ) {
      return
    }

    likeSubmittingRef.current = true
    setIsLikeSubmitting(true)
    setLikeError(undefined)

    try {
      const response = isLiked
        ? await unlikePost(numericProjectId, numericPostId)
        : await likePost(numericProjectId, numericPostId)
      setIsLiked(response.liked)
      setLikeCount(response.likeCount)
    } catch (error: unknown) {
      setLikeError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
    } finally {
      likeSubmittingRef.current = false
      setIsLikeSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <TopNavBar title="게시글" onBack={goToFeed} />
        <main
          className="flex flex-1 items-center justify-center"
          role="status"
          aria-label="게시글 상세 불러오는 중"
        >
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        </main>
      </Layout>
    )
  }

  if (detailError || !post) {
    return (
      <Layout>
        <TopNavBar title="게시글" onBack={goToFeed} />
        <EmptyState
          title="게시글을 불러오지 못했어요"
          description={detailError ?? '게시글 상세 응답을 확인할 수 없습니다.'}
          action={
            <Button
              type="button"
              fullWidth={false}
              onClick={() => void loadDetail()}
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
      <TopNavBar title="게시글" onBack={goToFeed} />

      <main className="flex-1 px-5 pb-24 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-gray-900">
              {post.authorNickname ?? '알 수 없는 사용자'}
            </p>
            <p className="text-caption font-normal text-gray-400">
              {formatPostTime(post.createdAt)}
            </p>
          </div>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="게시글 메뉴 열기"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-20 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <article className="mt-5 rounded-lg bg-white p-5 shadow-md">
          {post.isNotice && (
            <p className="mb-3 text-caption font-semibold text-blue-600">공지</p>
          )}
          <p className="whitespace-pre-wrap text-body-sm text-gray-700">
            {post.content}
          </p>

          {post.attachments.length > 0 && (
            <div className="mt-5 space-y-2">
              {post.attachments.map((attachment, index) => {
                const AttachmentIcon =
                  attachment.type === 'LINK' ? Link : FileText

                return (
                  <div
                    key={`${attachment.id ?? attachment.fileId ?? attachment.fileName}-${index}`}
                    className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-3"
                  >
                    <AttachmentIcon
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-blue-600">
                      {attachment.fileName}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-5 flex items-center gap-4 text-caption font-normal text-gray-400">
            <button
              type="button"
              disabled={isLikeSubmitting}
              aria-label={isLiked ? '게시글 좋아요 취소' : '게시글 좋아요'}
              aria-pressed={isLiked}
              onClick={() => void handleLike()}
              className={`flex items-center gap-1 disabled:cursor-not-allowed ${
                isLiked ? 'text-error' : 'text-gray-400'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`}
                aria-hidden
              />
              {likeCount}
            </button>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" aria-hidden />
              {post.commentCount}
            </span>
          </div>
        </article>

        <p className="py-6 text-center text-body-sm text-gray-400">
          댓글 기능은 준비 중이에요.
        </p>
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-mobile -translate-x-1/2 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            aria-label="댓글 입력"
            placeholder="댓글 기능은 준비 중이에요."
            value=""
            disabled
            readOnly
            className="rounded-full border-0 bg-gray-100"
          />
          <button
            type="button"
            aria-label="댓글 전송"
            disabled
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-400"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="게시글을 삭제하시겠습니까?"
        description={
          deleteError ? (
            <span className="text-error">{deleteError}</span>
          ) : (
            '삭제된 게시글은 복구할 수 없어요'
          )
        }
        confirmText={isDeleting ? '삭제 중' : '삭제하기'}
        cancelText="취소"
        destructive
        confirmDisabled={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
      <AlertModal
        open={Boolean(likeError)}
        title="좋아요를 변경하지 못했어요"
        description={likeError}
        onConfirm={() => setLikeError(undefined)}
      />
    </Layout>
  )
}
