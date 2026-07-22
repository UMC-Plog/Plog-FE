import type { AvatarPresetId } from '../components/AvatarPicker'

export interface NoticeAuthor {
  id: string
  nickname: string
  avatarId: AvatarPresetId | null
  avatarImageUrl: string | null
}

export interface Notice {
  id: string
  projectId: string
  title: string
  content: string
  author: NoticeAuthor
  createdAt: string
  updatedAt: string
}

export type CreateNoticeInput = Pick<Notice, 'projectId' | 'title' | 'content' | 'author'>
