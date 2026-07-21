import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateNoticeInput, Notice } from '../types/notice'

interface NoticeState {
  notices: Notice[]
  createNotice: (input: CreateNoticeInput) => Notice
  getNoticesByProjectId: (projectId: string) => Notice[]
  getNoticeById: (noticeId: string) => Notice | undefined
  updateNotice: (
    noticeId: string,
    updates: Pick<Notice, 'title' | 'content'>
  ) => Notice | undefined
  deleteNotice: (noticeId: string) => void
}

export const useNoticeStore = create<NoticeState>()(
  persist(
    (set, get) => ({
      notices: [],

      createNotice: (input) => {
        const now = new Date().toISOString()
        const notice: Notice = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({ notices: [notice, ...state.notices] }))
        return notice
      },

      getNoticesByProjectId: (projectId) =>
        get()
          .notices.filter((notice) => notice.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      getNoticeById: (noticeId) =>
        get().notices.find((notice) => notice.id === noticeId),

      updateNotice: (noticeId, updates) => {
        let updatedNotice: Notice | undefined

        set((state) => ({
          notices: state.notices.map((notice) => {
            if (notice.id !== noticeId) return notice

            updatedNotice = {
              ...notice,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
            return updatedNotice
          }),
        }))

        return updatedNotice
      },

      deleteNotice: (noticeId) =>
        set((state) => ({
          notices: state.notices.filter((notice) => notice.id !== noticeId),
        })),
    }),
    {
      name: 'plog-notice-storage',
      partialize: (state) => ({ notices: state.notices }),
    }
  )
)
