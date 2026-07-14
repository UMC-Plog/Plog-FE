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
}

export type CreatePostInput = Pick<
  Post,
  'projectId' | 'title' | 'content' | 'author' | 'attachments'
>
