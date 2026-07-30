import type { AvatarPresetId } from '../components/AvatarPicker'
import type { ProfilePreset } from '../lib/profilePreset'

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
  title: string
  content: string
  isNotice?: boolean
  attachments?: ServerPostAttachmentRequest[]
}

export interface ServerPostCreateResponse {
  postId?: number
  projectId?: number
  projectMemberId?: number
  authorNickname?: string | null
  profilePreset?: ProfilePreset | null
  title?: string
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

export interface ServerPostNoticeRequest {
  isNotice: boolean
}

export interface ServerPostNoticeResponse {
  postId?: number
  projectId?: number
  isNotice?: boolean
  updatedAt?: string
}

export interface PostNoticeResult {
  postId: number
  projectId: number
  isNotice: boolean
  updatedAt: string
}

export interface PostLikeResult {
  postId: number
  liked: boolean
  likeCount: number
}

export interface ServerPostAttachmentResponse {
  postAttachmentId?: number
  attachmentType?: ServerPostAttachmentType
  fileId?: number
  fileName?: string
  fileSize?: number
  linkUrl?: string | null
  downloadUrlApi?: string | null
}

export interface ServerPostResponse {
  postId?: number
  projectId?: number
  projectMemberId?: number
  authorNickname?: string | null
  profilePreset?: ProfilePreset | null
  title?: string
  content?: string
  isNotice?: boolean
  likeCount?: number
  commentCount?: number
  likedByMe?: boolean
  attachments?: ServerPostAttachmentResponse[]
  createdAt?: string
  updatedAt?: string
}

export interface ServerPostFeedResponse {
  notice?: ServerPostResponse | null
  posts?: ServerPostResponse[]
  nextCursor?: string | null
  hasNext?: boolean
}

export interface PostFeedAttachmentViewModel {
  id?: number
  type: ServerPostAttachmentType
  fileId?: number
  fileName: string
  fileSize?: number
  linkUrl?: string | null
  downloadUrlApi?: string | null
}

export interface PostListItemViewModel {
  postId: number
  projectId: number
  projectMemberId: number
  authorNickname: string | null
  profilePreset: ProfilePreset | null
  title: string
  content: string
  isNotice: boolean
  likeCount: number
  commentCount: number
  likedByMe: boolean
  attachments: PostFeedAttachmentViewModel[]
  createdAt: string
  updatedAt: string
}

export type PostDetailViewModel = PostListItemViewModel

export interface PostFeedResult {
  notice: PostListItemViewModel | null
  posts: PostListItemViewModel[]
  nextCursor: string | null
  hasNext: boolean
}

export interface ServerPostUpdateRequest {
  title?: string
  content?: string
}

export interface ServerPostUpdateResponse
  extends Omit<ServerPostResponse, 'createdAt'> {}

export interface ServerPostCommentCreateRequest {
  content: string
}

export interface ServerPostCommentResponse {
  commentId?: number
  postId?: number
  projectId?: number
  projectMemberId?: number
  authorNickname?: string | null
  profilePreset?: ProfilePreset | null
  content?: string
  createdAt?: string
}

export interface ServerPostCommentListResponse {
  postId?: number
  comments?: ServerPostCommentResponse[]
}

export interface PostCommentViewModel {
  commentId: number
  postId: number
  projectId: number
  projectMemberId: number
  authorNickname: string | null
  profilePreset: ProfilePreset | null
  content: string
  createdAt: string
}
