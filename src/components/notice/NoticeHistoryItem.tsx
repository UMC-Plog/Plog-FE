import { Ellipsis } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { PostListItemViewModel } from '../../types/post'
import { PostAuthorAvatar } from '../post/PostAuthorAvatar'

interface NoticeHistoryItemProps {
  notice: PostListItemViewModel
  isMenuOpen: boolean
  canManage: boolean
  isDeleting: boolean
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
  canManage,
  isDeleting,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
}: NoticeHistoryItemProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onCloseMenu()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMenu()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
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
      <div className="flex items-center gap-4">
        <PostAuthorAvatar
          profilePreset={notice.profilePreset}
          className="h-[46px] w-[46px]"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-normal leading-7 text-gray-900">
            {notice.authorNickname ?? '알 수 없는 사용자'}
          </p>
          <p className="text-[12px] font-normal leading-4 text-gray-400">
            {formatNoticeTime(notice.createdAt)}
          </p>
        </div>

        {canManage && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={`${notice.title} 공지 메뉴 ${isMenuOpen ? '닫기' : '열기'}`}
              aria-expanded={isMenuOpen}
              disabled={isDeleting}
              onClick={(event) => {
                event.stopPropagation()
                onToggleMenu()
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
            >
              <Ellipsis className="h-[22px] w-[22px]" aria-hidden />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-30 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleEdit()
                  }}
                  className="w-full px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete()
                  }}
                  className="w-full border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-300"
                >
                  {isDeleting ? '삭제 중' : '삭제'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-16 border border-gray-100 bg-gray-25 px-[23px] py-[25px] shadow-card">
        <div className="flex h-10 items-start border-b border-gray-200">
          <h2 className="break-words text-[16px] font-semibold leading-6 text-gray-900">
            {notice.title}
          </h2>
        </div>
        <p className="mt-5 whitespace-pre-wrap break-words text-[14px] font-normal leading-5 text-gray-900">
          {notice.content}
        </p>
      </div>
    </article>
  )
}
