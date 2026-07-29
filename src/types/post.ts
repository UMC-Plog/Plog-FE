import type { AvatarPresetId } from '../components/AvatarPicker'

export interface PostAuthor {
  id: string
  nickname: string
  avatarId: AvatarPresetId | null
  avatarImageUrl: string | null
}

export interface PostAttachment {
  id: string
  name: string
  type: 'file' | 'link' | 'image'
  size?: number
  url?: string
}

export interface Post {
  id: string
  projectId: string
  title: string
  content: string
  author: PostAuthor
  attachments: PostAttachment[]
  createdAt: string
  updatedAt: string
  likeCount: number
  commentCount: number
  likedUserIds: string[]
}

export interface PostComment {
  id: string
  postId: string
  author: PostAuthor
  content: string
  createdAt: string
}

export type CreatePostInput = Pick<
  Post,
  'projectId' | 'title' | 'content' | 'author' | 'attachments'
>

export type CreateCommentInput = Pick<PostComment, 'postId' | 'author' | 'content'>

export type ServerPostAttachmentType = 'FILE' | 'LINK'

export interface ServerPostAttachmentRequest {
  attachmentType?: ServerPostAttachmentType
  fileName?: string
  fileSize?: number
  fileKey?: string
  fileId?: number
  linkUrl?: string
}

export interface ServerPostCreateRequest {
  content: string
  isNotice?: boolean
  attachments?: ServerPostAttachmentRequest[]
}

export interface ServerPostCreateResponse {
  postId?: number
  projectId?: number
  projectMemberId?: number
  content?: string
  isNotice?: boolean
  likeCount?: number
  commentCount?: number
  likedByMe?: boolean
  attachments?: unknown[]
  createdAt?: string
}

export interface ServerPostDeleteResponse {
  deleted?: boolean
}

export interface ServerPostLikeResponse {
  postId?: number
  liked?: boolean
  likeCount?: number
}

export interface PostLikeResult {
  postId: number
  liked: boolean
  likeCount: number
}
