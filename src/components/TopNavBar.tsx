import { ChevronLeft, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TopNavBarProps {
  title: string
  onBack?: () => void
  onSettingsClick?: () => void
  showSettings?: boolean
}

export function TopNavBar({
  title,
  onBack,
  onSettingsClick,
  showSettings = true,
}: TopNavBarProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-12 items-center border-b border-gray-200 bg-white px-2">
      <button
        type="button"
        aria-label="뒤로가기"
        onClick={onBack ?? (() => navigate(-1))}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-50"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>

      <h1 className="min-w-0 flex-1 truncate px-2 text-body-sm font-semibold text-gray-900">
        {title}
      </h1>

      {showSettings ? (
        <button
          type="button"
          aria-label="프로젝트 설정"
          onClick={onSettingsClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </button>
      ) : (
        <span className="h-10 w-10 shrink-0" aria-hidden />
      )}
    </header>
  )
}
