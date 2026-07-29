import { FileText, Heart, Image, Link, MessageSquare, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { likePost, unlikePost } from '../../api/postApi'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { AlertModal } from '../Modal'
import { useAuthStore } from '../../store/authStore'
import type { Post } from '../../types/post'

interface PostFeedItemProps {
  post: Post
  onClick: () => void
}

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

export function PostFeedItem({ post, onClick }: PostFeedItemProps) {
  const user = useAuthStore((state) => state.user)
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === post.author.avatarId)
  const avatarSrc = post.author.avatarImageUrl ?? avatarPreset?.src
  const attachment = post.attachments[0]
  const AttachmentIcon = attachment?.type === 'link' ? Link : attachment?.type === 'image' ? Image : FileText
  const initialIsLiked = Boolean(user && post.likedUserIds?.includes(user.id))
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [likeError, setLikeError] = useState<string>()
  const likeSubmittingRef = useRef(false)

  useEffect(() => {
    setIsLiked(initialIsLiked)
    setLikeCount(post.likeCount)
    setLikeError(undefined)
    likeSubmittingRef.current = false
    setIsLikeSubmitting(false)
  }, [initialIsLiked, post.id, post.likeCount, post.projectId])

  const handleLike = async () => {
    if (!user || likeSubmittingRef.current) return

    const numericProjectId =
      /^[1-9]\d*$/.test(post.projectId) &&
      Number.isSafeInteger(Number(post.projectId))
        ? Number(post.projectId)
        : null
    const numericPostId =
      /^[1-9]\d*$/.test(post.id) && Number.isSafeInteger(Number(post.id))
        ? Number(post.id)
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

  return (
    <>
      <article
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
      className="w-full cursor-pointer rounded-lg bg-white p-4 text-left shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-gray-900">{post.author.nickname}</p>
          <p className="text-caption font-normal text-gray-400">{formatPostTime(post.createdAt)}</p>
        </div>
      </div>

      <h2 className="mt-4 text-body font-semibold text-gray-900">{post.title}</h2>

      {attachment && (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-gray-50 px-3 py-3">
          <AttachmentIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-body-sm text-blue-600">{attachment.name}</p>
          {formatFileSize(attachment.size) && (
            <span className="shrink-0 text-caption font-normal text-gray-400">
              {formatFileSize(attachment.size)}
            </span>
          )}
          {post.attachments.length > 1 && (
            <span className="shrink-0 text-caption font-normal text-gray-400">
              +{post.attachments.length - 1}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-caption font-normal text-gray-400">
        <button
          type="button"
          disabled={!user || isLikeSubmitting}
          aria-label={isLiked ? '게시글 좋아요 취소' : '게시글 좋아요'}
          aria-pressed={isLiked}
          onClick={(event) => {
            event.stopPropagation()
            void handleLike()
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className={`flex cursor-pointer items-center gap-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed ${
            isLiked ? 'text-error hover:text-error/80' : 'text-gray-400 hover:text-error'
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} aria-hidden />
          {likeCount}
        </button>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
      </div>
      </article>
      <AlertModal
        open={Boolean(likeError)}
        title="좋아요를 변경하지 못했어요"
        description={likeError}
        onConfirm={() => setLikeError(undefined)}
      />
    </>
  )
}
