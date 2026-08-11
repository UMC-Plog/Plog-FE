import { ArrowRight, Ellipsis, Heart, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import {
  deletePost as requestDeletePost,
  createPostComment,
  fetchPostComments,
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
import type { PostCommentViewModel } from '../../../types/post'
import { PostAuthorAvatar } from '../../../components/post/PostAuthorAvatar'
import { useProjectStore } from '../../../store/projectStore'
import { AttachmentList } from '../../../components/attachment/AttachmentList'
import type { NormalizedAttachment } from '../../../types/attachment'

function formatPostTime(createdAt: string) {
  const createdTime = Date.parse(createdAt)
  if (Number.isNaN(createdTime)) return '시간 정보 없음'

  const minutes = Math.floor((Date.now() - createdTime) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  return `${Math.floor(hours / 24)}일 전`
}

function sortCommentsNewestFirst(comments: PostCommentViewModel[]) {
  return [...comments].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt)
    const rightTime = Date.parse(right.createdAt)
    const safeLeftTime = Number.isNaN(leftTime) ? Number.NEGATIVE_INFINITY : leftTime
    const safeRightTime = Number.isNaN(rightTime) ? Number.NEGATIVE_INFINITY : rightTime

    return safeRightTime - safeLeftTime || right.commentId - left.commentId
  })
}

function parsePositiveSafeInteger(value: string | undefined) {
  return value &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Number(value)
    : null
}

function normalizePostAttachments(
  post: PostDetailViewModel
): NormalizedAttachment[] {
  return post.attachments.map((attachment) =>
    attachment.type === 'FILE'
      ? {
          attachmentId: attachment.id,
          attachmentType: 'FILE',
          fileName: attachment.fileName,
          fileSize: attachment.fileSize ?? null,
          downloadUrlApi: attachment.downloadUrlApi ?? null,
        }
      : {
          attachmentId: attachment.id,
          attachmentType: 'LINK',
          fileName: attachment.fileName,
          linkUrl: attachment.linkUrl!,
        }
  )
}

export default function PostDetailPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const numericProjectId = parsePositiveSafeInteger(projectId)
  const numericPostId = parsePositiveSafeInteger(postId)
  const currentProject = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)
  )
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
  const [comments, setComments] = useState<PostCommentViewModel[]>([])
  const [commentValue, setCommentValue] = useState('')
  const [commentError, setCommentError] = useState<string>()
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const deletingRef = useRef(false)
  const likeSubmittingRef = useRef(false)
  const detailRequestRef = useRef(0)
  const commentSubmittingRef = useRef(false)
  const commentIdsRef = useRef(new Set<number>())
  const currentProjectMemberId =
    currentProject &&
    Number.isSafeInteger(currentProject.myProjectMemberId) &&
    currentProject.myProjectMemberId > 0
      ? currentProject.myProjectMemberId
      : null
  const isPostAuthor =
    post !== undefined &&
    currentProjectMemberId !== null &&
    currentProjectMemberId === post.projectMemberId
  const canEditPost = isPostAuthor
  const canDeletePost = isPostAuthor
  const normalizedAttachments = post ? normalizePostAttachments(post) : []

  const loadDetail = useCallback(async () => {
    const requestId = ++detailRequestRef.current
    setPost(undefined)
    setIsLoading(true)
    setDetailError(undefined)
    setIsMenuOpen(false)
    setIsDeleteDialogOpen(false)
    setDeleteError(undefined)
    setLikeError(undefined)
    setComments([])
    commentIdsRef.current = new Set()
    setCommentError(undefined)
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
      try {
        const nextComments = await fetchPostComments(
          numericProjectId,
          numericPostId
        )
        if (requestId === detailRequestRef.current) {
          commentIdsRef.current = new Set(
            nextComments.map((comment) => comment.commentId)
          )
          setComments(sortCommentsNewestFirst(nextComments))
        }
      } catch (error: unknown) {
        if (requestId === detailRequestRef.current) {
          setCommentError(
            error instanceof ApiError
              ? error.message
              : '댓글을 불러오지 못했습니다.'
          )
        }
      }
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
    if (!canEditPost) return
    setIsMenuOpen(false)
    if (post && projectId && postId) {
      navigate(`/project/${projectId}/posts/${postId}/edit`)
    }
  }

  const handleDelete = () => {
    if (!post || !canDeletePost) return
    setIsMenuOpen(false)
    setDeleteError(undefined)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (
      !post ||
      !canDeletePost ||
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

  const handleCreateComment = async () => {
    const normalized = commentValue.trim()
    if (
      numericProjectId === null ||
      numericPostId === null ||
      !normalized ||
      normalized.length > 1000 ||
      commentSubmittingRef.current
    ) return

    commentSubmittingRef.current = true
    setIsCommentSubmitting(true)
    setCommentError(undefined)
    try {
      const comment = await createPostComment(
        numericProjectId,
        numericPostId,
        { content: normalized }
      )
      if (commentIdsRef.current.has(comment.commentId)) {
        setCommentValue('')
        return
      }
      commentIdsRef.current.add(comment.commentId)
      setComments((current) => [comment, ...current])
      setCommentValue('')
      setPost((current) =>
        current ? { ...current, commentCount: current.commentCount + 1 } : current
      )
    } catch (error: unknown) {
      setCommentError(
        error instanceof ApiError ? error.message : '댓글을 등록하지 못했습니다.'
      )
    } finally {
      commentSubmittingRef.current = false
      setIsCommentSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="sticky top-[env(safe-area-inset-top)] z-10 shrink-0 bg-gray-25">
          <TopNavBar title="게시글" onBack={goToFeed} variant="projectContent" />
        </div>
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
        <div className="sticky top-[env(safe-area-inset-top)] z-10 shrink-0 bg-gray-25">
          <TopNavBar title="게시글" onBack={goToFeed} variant="projectContent" />
        </div>
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
      <div className="sticky top-[env(safe-area-inset-top)] z-10 shrink-0 bg-gray-25">
        <TopNavBar title="게시글" onBack={goToFeed} variant="projectContent" />
      </div>

      <main className="flex-1 px-5 pb-24 pt-6">
        <div className="flex items-center gap-3">
          <PostAuthorAvatar
            profilePreset={post.profilePreset}
            className="h-[46px] w-[46px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-normal leading-7 text-gray-900">
              {post.authorNickname ?? '알 수 없는 사용자'}
            </p>
            <p className="text-[12px] font-normal leading-4 text-gray-400">
              {formatPostTime(post.createdAt)}
            </p>
          </div>

          {(canEditPost || canDeletePost) && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="게시글 메뉴 열기"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
              >
                <Ellipsis className="h-[22px] w-[22px]" aria-hidden />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-10 z-20 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
                  {canEditPost && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="w-full px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
                    >
                      수정
                    </button>
                  )}
                  {canDeletePost && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
                    >
                      삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <article className="mt-5 rounded-16 border border-gray-100 bg-gray-25 px-[23px] py-[25px] shadow-card">
          {post.isNotice && (
            <p className="mb-3 text-caption font-semibold text-blue-600">공지</p>
          )}
          <div className="flex h-10 items-start border-b border-gray-200">
            <h1 className="text-[16px] font-semibold leading-6 text-gray-900">
              {post.title}
            </h1>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[14px] font-normal leading-5 text-gray-900">
            {post.content}
          </p>

          <AttachmentList
            attachments={normalizedAttachments}
            variant="postDetail"
            className="mt-4"
          />

          <div className="mt-4 flex items-center gap-[18px] text-[12px] font-normal leading-4 text-gray-400">
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
                className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`}
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

        <section className="pt-1" aria-label="댓글">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-gray-400">
              아직 댓글이 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {comments.map((comment) => (
                <li key={comment.commentId} className="flex gap-2.5 py-[14px]">
                  <PostAuthorAvatar
                    profilePreset={comment.profilePreset}
                    className="h-10 w-10"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[15px] font-normal leading-6 text-gray-900">
                      {comment.authorNickname ?? '알 수 없는 사용자'}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-[14px] font-normal leading-5 text-gray-500">
                      {comment.content}
                    </p>
                  </div>
                  <span className="shrink-0 text-caption font-normal text-gray-400">
                    {formatPostTime(comment.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {commentError && (
            <p className="mt-4 text-center text-caption font-normal text-error">
              {commentError}
            </p>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 h-[88px] w-full max-w-mobile -translate-x-1/2 border-t border-gray-100 bg-white px-5 pb-[30px] pt-[13px]">
        <div className="flex items-center gap-2">
          <Input
            aria-label="댓글 입력"
            placeholder="댓글을 입력해 주세요."
            value={commentValue}
            maxLength={1000}
            disabled={isCommentSubmitting}
            onChange={(event) => {
              setCommentValue(event.target.value)
              setCommentError(undefined)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void handleCreateComment()
              }
            }}
            className="h-[42px] rounded-[21px] border-0 bg-gray-100 px-[18px] text-[15px] font-normal leading-6"
          />
          <button
            type="button"
            aria-label="댓글 전송"
            disabled={
              isCommentSubmitting ||
              !commentValue.trim() ||
              commentValue.trim().length > 1000
            }
            onClick={() => void handleCreateComment()}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-12 bg-blue-500 text-white disabled:bg-gray-200 disabled:text-gray-400"
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
