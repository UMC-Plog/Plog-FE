import { Ellipsis, UserRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import type { Notice } from '../../types/notice'

interface NoticeHistoryItemProps {
  notice: Notice
  isMenuOpen: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
  onEdit: () => void
  onDelete: () => void
}

function formatNoticeTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt))
}

export function NoticeHistoryItem({
  notice,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: NoticeHistoryItemProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === notice.author.avatarId)
  const avatarSrc = notice.author.avatarImageUrl ?? avatarPreset?.src

  useEffect(() => {
    if (!isMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onCloseMenu()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isMenuOpen, onCloseMenu])

  const handleEdit = () => {
    onCloseMenu()
    onEdit()
  }

  const handleDelete = () => {
    onCloseMenu()
    onDelete()
  }

  return (
    <article className="relative">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-gray-900">
            {notice.author.nickname}
          </p>
          <p className="text-caption font-normal text-gray-400">
            {formatNoticeTime(notice.createdAt)}
          </p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label={`${notice.title} 공지 메뉴 ${isMenuOpen ? '닫기' : '열기'}`}
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
          >
            <Ellipsis className="h-5 w-5" aria-hidden />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 z-30 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
              <button
                type="button"
                onClick={handleEdit}
                className="w-full px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-white p-5 shadow-md">
        <h2 className="break-words text-title font-bold text-gray-900">{notice.title}</h2>
        <div className="my-5 h-px bg-gray-100" />
        <p className="whitespace-pre-wrap break-words text-body-sm text-gray-700">
          {notice.content}
        </p>
      </div>
    </article>
  )
}
