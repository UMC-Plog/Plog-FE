import { Ellipsis, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Layout } from '../../../components/Layout'
import { TopNavBar } from '../../../components/TopNavBar'
import { useNoticeStore } from '../../../store/noticeStore'

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

export default function NoticeDetailPage() {
  const { id: projectId, noticeId } = useParams<{ id: string; noticeId: string }>()
  const navigate = useNavigate()
  const notices = useNoticeStore((state) => state.notices)
  const deleteNotice = useNoticeStore((state) => state.deleteNotice)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const notice = notices.find(
    (item) => item.id === noticeId && item.projectId === projectId
  )

  useEffect(() => {
    if (!isMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isMenuOpen])

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const handleEdit = () => {
    setIsMenuOpen(false)
    if (projectId && noticeId) {
      navigate(`/project/${projectId}/notices/${noticeId}/edit`)
    }
  }

  const handleDelete = () => {
    setIsMenuOpen(false)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!noticeId) return
    deleteNotice(noticeId)
    setIsDeleteDialogOpen(false)
    goToFeed()
  }

  if (!notice) {
    return (
      <Layout>
        <TopNavBar title="공지" showSettings={false} onBack={goToFeed} />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-title font-bold text-gray-700">공지를 찾을 수 없어요</p>
          <p className="mt-1.5 text-body-sm text-gray-400">
            삭제되었거나 존재하지 않는 공지예요
          </p>
          <Button type="button" size="sm" fullWidth={false} onClick={goToFeed} className="mt-6">
            피드로 돌아가기
          </Button>
        </main>
      </Layout>
    )
  }

  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === notice.author.avatarId)
  const avatarSrc = notice.author.avatarImageUrl ?? avatarPreset?.src

  return (
    <Layout>
      <TopNavBar title="공지" showSettings={false} onBack={goToFeed} />

      <main className="flex-1 px-5 py-5">
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
              aria-label="공지 메뉴 열기"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-20 w-24 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
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

        <article className="mt-5 rounded-lg bg-white p-5 shadow-md">
          <h1 className="text-title font-bold text-gray-900">{notice.title}</h1>
          <div className="my-5 h-px bg-gray-100" />
          <p className="whitespace-pre-wrap text-body-sm text-gray-700">{notice.content}</p>
        </article>
      </main>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="공지를 삭제하시겠습니까?"
        description="삭제된 공지는 복구할 수 없어요"
        confirmText="삭제하기"
        cancelText="취소"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </Layout>
  )
}
