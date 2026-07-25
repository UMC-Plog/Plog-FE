import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AVATAR_PRESETS } from '../components/AvatarPicker'
import type { ChatMessage, ChatSender } from '../types/chat'

const avatar = (id: string) => AVATAR_PRESETS.find((item) => item.id === id)?.src ?? ''

const ME: ChatSender = { id: 'me', name: '나', avatarUrl: avatar('panda') }
const GOMGOM: ChatSender = { id: 'gomgom', name: '곰곰', avatarUrl: avatar('otter') }
const PODO: ChatSender = { id: 'podo', name: '포도', avatarUrl: avatar('koala') }

const initialMessages: Record<string, ChatMessage[]> = {
  'project-test': [
    { id: 'm1', projectId: 'project-test', sender: GOMGOM, isMine: false, sentAt: '2025-05-22T11:03:00+09:00', type: 'text', text: 'API PR 리뷰 부탁드려요! @바나나 확인해주실 수 있나요?' },
    { id: 'm2', projectId: 'project-test', sender: ME, isMine: true, sentAt: '2025-05-22T11:03:00+09:00', type: 'text', text: '네, 바로 확인해볼게요!' },
    { id: 'm3', projectId: 'project-test', sender: ME, isMine: true, sentAt: '2025-05-22T11:04:00+09:00', type: 'file', fileName: '설계문서_v2.pdf', fileSize: '2.4 MB', mimeType: 'application/pdf' },
    { id: 'm4', projectId: 'project-test', sender: PODO, isMine: false, sentAt: '2025-05-23T11:10:00+09:00', type: 'text', text: '@곰곰 수고하셨어요! 오늘 회의 10시로 변경 가능할까요?' },
    { id: 'm5', projectId: 'project-test', sender: PODO, isMine: false, sentAt: '2025-05-23T11:30:00+09:00', type: 'file', fileName: '회의록_0523.docx', fileSize: '1.1 MB', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  ],
}

interface ChatState {
  messagesByProject: Record<string, ChatMessage[]>
  lastReadAtByProject: Record<string, string>
  sendText: (projectId: string, text: string) => void
  sendFile: (projectId: string, file: Pick<Extract<ChatMessage, { type: 'file' }>, 'fileName' | 'fileSize' | 'mimeType' | 'dataUrl'>) => void
  markAsRead: (projectId: string) => void
}

const createMine = (projectId: string) => ({
  id: crypto.randomUUID(),
  projectId,
  sender: ME,
  isMine: true,
  sentAt: new Date().toISOString(),
})

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messagesByProject: initialMessages,
      lastReadAtByProject: {},
      markAsRead: (projectId) =>
        set((state) => ({
          lastReadAtByProject: { ...state.lastReadAtByProject, [projectId]: new Date().toISOString() },
        })),
      sendText: (projectId, text) =>
        set((state) => ({
          messagesByProject: {
            ...state.messagesByProject,
            [projectId]: [
              ...(state.messagesByProject[projectId] ?? []),
              { ...createMine(projectId), type: 'text', text },
            ],
          },
        })),
      sendFile: (projectId, file) =>
        set((state) => ({
          messagesByProject: {
            ...state.messagesByProject,
            [projectId]: [
              ...(state.messagesByProject[projectId] ?? []),
              { ...createMine(projectId), type: 'file', ...file },
            ],
          },
        })),
    }),
    { name: 'plog-chat-storage' }
  )
)
