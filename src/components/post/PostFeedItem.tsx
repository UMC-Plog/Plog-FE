import { FileText, Heart, Image, Link, MessageSquare, UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import type { Post } from '../../types/post'

interface PostFeedItemProps {
  post: Post
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

export function PostFeedItem({ post }: PostFeedItemProps) {
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === post.author.avatarId)
  const avatarSrc = post.author.avatarImageUrl ?? avatarPreset?.src
  const attachment = post.attachments[0]
  const AttachmentIcon = attachment?.type === 'link' ? Link : attachment?.type === 'image' ? Image : FileText

  return (
    <article className="rounded-lg bg-white p-4 shadow-md">
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
        <span className="flex items-center gap-1">
          <Heart className="h-4 w-4" aria-hidden />
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" aria-hidden />
          {post.commentCount}
        </span>
      </div>
    </article>
  )
}
