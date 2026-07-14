import { Plus, SquarePen, Volume2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'

export default function ProjectFeedPage() {
  const [isWriteMenuOpen, setIsWriteMenuOpen] = useState(false)

  const closeWriteMenu = () => setIsWriteMenuOpen(false)

  return (
    <div className="relative flex min-h-[calc(100svh-theme(spacing.12)-theme(spacing.10))] overflow-hidden whitespace-pre-line bg-gray-25">
      <EmptyState
        title="아직 게시글이 없어요"
        description={'첫 게시물이나 공지를 작성해\n팀원들과 진행 상황을 공유해보세요'}
      />

      {isWriteMenuOpen && (
        <button
          type="button"
          aria-label="작성 메뉴 닫기"
          onClick={closeWriteMenu}
          className="fixed inset-y-0 left-1/2 z-10 w-full max-w-mobile -translate-x-1/2 bg-gray-900/30"
        />
      )}

      {isWriteMenuOpen && (
        <div className="absolute bottom-20 right-4 z-20 overflow-hidden rounded-lg bg-white shadow-lg">
          <button
            type="button"
            onClick={closeWriteMenu}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
          >
            <SquarePen
              className="h-5 w-5 text-primary stroke-primary [&>path:nth-of-type(2)]:fill-current"
              aria-hidden
            />
            게시글 작성
          </button>
          <button
            type="button"
            onClick={closeWriteMenu}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-body-sm text-gray-700 hover:bg-gray-50"
          >
            <Volume2 className="h-5 w-5 text-primary" aria-hidden />
            공지 작성
          </button>
        </div>
      )}

      <Button
        type="button"
        fullWidth={false}
        aria-label={isWriteMenuOpen ? '작성 메뉴 닫기' : '작성 메뉴 열기'}
        onClick={() => setIsWriteMenuOpen((isOpen) => !isOpen)}
        className="absolute bottom-4 right-4 z-20 h-12 w-12 rounded-full p-0 text-white shadow-md"
      >
        {isWriteMenuOpen ? (
          <X className="h-6 w-6 text-white" aria-hidden />
        ) : (
          <Plus className="h-6 w-6 text-white" aria-hidden />
        )}
      </Button>
    </div>
  )
}
