import { apiRequest } from './client'
import type { ProfilePreset } from '../lib/profilePreset'

interface SliceResponse<T> {
  content: T[]
  page: number
  size: number
  hasNext: boolean
}

export interface ChatChannelParticipantResponse {
  userId: number
  nickname: string
  profilePreset: ProfilePreset | null
}

export interface ChatChannelResponse {
  projectId: number
  projectName: string
  roomId: number
  latestMessage: string | null
  latestMessageAt: string | null
  hasUnreadMessage: boolean
  unreadMessageCount: number
  participants: ChatChannelParticipantResponse[]
}

export interface ChatMessageAttachmentResponse {
  chatAttachmentId: number
  fileName: string
  fileSize: number
  fileUrl: string
}

export interface ChatMessageResponse {
  chatId: number
  roomId: number
  messageSequence: number
  senderMemberId: number
  senderNickname: string
  profilePreset: ProfilePreset | null
  message: string
  attachments: ChatMessageAttachmentResponse[]
  createdAt: string
}

export interface ChatMessageListResponse {
  messages: ChatMessageResponse[]
  hasNext: boolean
  nextCursor: number | null
}

export interface ChatReadResponse {
  roomId: number
  lastReadMessageSequence: number
  unreadMessageCount: number
}

export function fetchChannels(params: { page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return apiRequest<SliceResponse<ChatChannelResponse>>(`/api/dashboard/channels${qs ? `?${qs}` : ''}`)
}

export function searchChannels(params: { keyword?: string; page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  return apiRequest<SliceResponse<ChatChannelResponse>>(`/api/dashboard/channels/search?${query.toString()}`)
}

export function fetchMessages(roomId: number, params: { before?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.before !== undefined) query.set('before', String(params.before))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return apiRequest<ChatMessageListResponse>(`/api/chat-rooms/${roomId}/messages${qs ? `?${qs}` : ''}`)
}

export function markRoomAsRead(roomId: number, lastReadMessageId: number) {
  return apiRequest<ChatReadResponse>(`/api/chat-rooms/${roomId}/read`, {
    method: 'PATCH',
    body: { lastReadMessageId },
  })
}
