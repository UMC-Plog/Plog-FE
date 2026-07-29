import { ArrowRight, ArrowUpRight, Ellipsis, FileText, Heart, Image, Link, MessageSquare, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { ApiError } from '../../../api/client'
import {
  deletePost as requestDeletePost,
  likePost,
  unlikePost,
} from '../../../api/postApi'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { AlertModal } from '../../../components/Modal'
import { TopNavBar } from '../../../components/TopNavBar'
import { usePostStore } from '../../../store/postStore'
import { useAuthStore } from '../../../store/authStore'
import type { PostAttachment } from '../../../types/post'

function formatPostTime(createdAt: string) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  return `${Math.floor(hours / 24)}일 전`
}

function formatFileSize(size?: number) {
  if (size === undefined) return null
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function getSafeLink(attachment: PostAttachment) {
  if (attachment.type !== 'link' || !attachment.url) return null
  try {
    const url = new URL(attachment.url)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export default function PostDetailPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const posts = usePostStore((state) => state.posts)
  const allComments = usePostStore((state) => state.comments)
  const addComment = usePostStore((state) => state.addComment)
  const user = useAuthStore((state) => state.user)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [likeError, setLikeError] = useState<string>()
  const [commentContent, setCommentContent] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const deletingRef = useRef(false)
  const likeSubmittingRef = useRef(false)

  const post = posts.find((item) => item.id === postId && item.projectId === projectId)
  const comments = useMemo(
    () =>
      postId
        ? allComments
            .filter((comment) => comment.postId === postId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [allComments, postId]
  )
  const storedIsLiked = Boolean(user && post?.likedUserIds?.includes(user.id))

  useEffect(() => {
    setIsLiked(storedIsLiked)
    setLikeCount(post?.likeCount ?? 0)
    setLikeError(undefined)
    likeSubmittingRef.current = false
    setIsLikeSubmitting(false)
  }, [post?.id, post?.likeCount, post?.projectId, storedIsLiked])

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
    if (projectId && postId) navigate(`/project/${projectId}/posts/${postId}/edit`)
  }

  const handleDelete = () => {
    setIsMenuOpen(false)
    setDeleteError(undefined)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (deletingRef.current) return

    const numericProjectId =
      projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
        ? Number(projectId)
        : null
    const numericPostId =
      postId && /^[1-9]\d*$/.test(postId) && Number.isSafeInteger(Number(postId))
        ? Number(postId)
        : null

    if (numericProjectId === null || numericPostId === null) {
      setDeleteError('올바른 게시글 경로가 아니어서 삭제할 수 없습니다.')
      return
    }

    deletingRef.current = true
    setIsDeleting(true)
    setDeleteError(undefined)

    try {
      await requestDeletePost(numericProjectId, numericPostId)
      navigate(`/project/${projectId}/feed`, { replace: true })
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
    if (!user || likeSubmittingRef.current) return

    const numericProjectId =
      projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
        ? Number(projectId)
        : null
    const numericPostId =
      postId && /^[1-9]\d*$/.test(postId) && Number.isSafeInteger(Number(postId))
        ? Number(postId)
        : null

    if (numericProjectId === null || numericPostId === null) {
      setLikeError('올바른 게시글 경로가 아니어서 좋아요를 변경할 수 없습니다.')
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

  const handleAddComment = () => {
    if (!projectId || !postId || !user || !commentContent.trim()) return

    const comment = addComment(projectId, {
      postId,
      content: commentContent,
      author: {
        id: user.id,
        nickname: user.nickname || user.realName || '사용자',
        avatarId: user.avatarId,
        avatarImageUrl: user.avatarImageUrl,
      },
    })
    if (comment) setCommentContent('')
  }

  if (!post) {
    return (
      <Layout>
        <TopNavBar title="게시글" onBack={goToFeed} />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-title font-bold text-gray-700">게시글을 찾을 수 없어요</p>
          <p className="mt-1.5 text-body-sm text-gray-400">
            삭제되었거나 존재하지 않는 게시글이에요
          </p>
          <Button type="button" size="sm" fullWidth={false} onClick={goToFeed} className="mt-6">
            피드로 돌아가기
          </Button>
        </main>
      </Layout>
    )
  }

  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === post.author.avatarId)
  const avatarSrc = post.author.avatarImageUrl ?? avatarPreset?.src

  return (
    <Layout>
      <TopNavBar title="게시글" onBack={goToFeed} />

      <main className="flex-1 px-5 pb-24 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold text-gray-900">{post.author.nickname}</p>
            <p className="text-caption font-normal text-gray-400">{formatPostTime(post.createdAt)}</p>
          </div>

          <div ref={menuRef} className="relative">
            <button type="button" aria-label="게시글 메뉴 열기" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((isOpen) => !isOpen)} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50">
              <Ellipsis className="h-5 w-5" aria-hidden />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-20 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
                <button type="button" onClick={handleEdit} className="w-full px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50">수정</button>
                <button type="button" onClick={handleDelete} className="w-full border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50">삭제</button>
              </div>
            )}
          </div>
        </div>

        <article className="mt-5 rounded-lg bg-white p-5 shadow-md">
          <h1 className="text-title font-bold text-gray-900">{post.title}</h1>
          <div className="my-5 h-px bg-gray-100" />
          <p className="whitespace-pre-wrap text-body-sm text-gray-700">{post.content}</p>

          {post.attachments.length > 0 && (
            <div className="mt-5 space-y-2">
              {post.attachments.map((attachment) => {
                const AttachmentIcon = attachment.type === 'link' ? Link : attachment.type === 'image' ? Image : FileText
                const safeLink = getSafeLink(attachment)
                const content = (
                  <>
                    <AttachmentIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-blue-600">{attachment.name}</span>
                    {formatFileSize(attachment.size) && <span className="shrink-0 text-caption font-normal text-gray-400">{formatFileSize(attachment.size)}</span>}
                    {attachment.type === 'link' && safeLink && (
                      <a
                        href={safeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${attachment.name} 링크 열기`}
                        onClick={(event) => event.stopPropagation()}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-sm px-1.5 py-1 text-caption text-primary hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                      >
                        열기
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </a>
                    )}
                  </>
                )

                return (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-3">{content}</div>
                )
              })}
            </div>
          )}

          <div className="mt-5 flex items-center gap-4 text-caption font-normal text-gray-400">
            <button type="button" disabled={!user || isLikeSubmitting} aria-pressed={isLiked} onClick={() => void handleLike()} className={`flex items-center gap-1 disabled:cursor-not-allowed ${isLiked ? 'text-error' : 'text-gray-400'}`}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} aria-hidden />{likeCount}
            </button>
            <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" aria-hidden />{post.commentCount}</span>
          </div>
        </article>

        <section className="mt-5">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-gray-400">아직 댓글이 없어요</p>
          ) : (
            comments.map((comment, index) => {
              const commentAvatar = AVATAR_PRESETS.find(
                (avatar) => avatar.id === comment.author.avatarId
              )
              const commentAvatarSrc = comment.author.avatarImageUrl ?? commentAvatar?.src

              return (
                <div key={comment.id} className={`flex gap-3 py-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                    {commentAvatarSrc ? (
                      <img src={commentAvatarSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-4 w-4 text-gray-400" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <p className="truncate text-body-sm font-semibold text-gray-900">{comment.author.nickname}</p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-body-sm text-gray-600">{comment.content}</p>
                  </div>
                  <span className="shrink-0 text-caption font-normal text-gray-400">
                    {formatPostTime(comment.createdAt)}
                  </span>
                </div>
              )
            })
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-mobile -translate-x-1/2 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Input aria-label="댓글 입력" placeholder="댓글을 입력하세요..." value={commentContent} disabled={!user} onChange={(event) => setCommentContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddComment() } }} className="rounded-full border-0 bg-gray-100" />
          <button type="button" aria-label="댓글 전송" disabled={!user || !commentContent.trim()} onClick={handleAddComment} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-white disabled:bg-gray-200 disabled:text-gray-400">
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
