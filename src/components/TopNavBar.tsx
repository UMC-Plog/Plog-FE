import { Bell, ChevronLeft, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

interface TopNavBarProps {
  title: string
  onBack?: () => void
  variant?: 'default' | 'projectContent'
  onNotificationClick?: () => void
  onSettingsClick?: () => void
  hasSettingsUpdate?: boolean
}

export function TopNavBar({
  title,
  onBack,
  variant = 'default',
  onNotificationClick,
  onSettingsClick,
  hasSettingsUpdate = false,
}: TopNavBarProps) {
  const navigate = useNavigate()
  const isProjectContent = variant === 'projectContent'

  return (
    <header
      className={cn(
        'flex h-12 items-center border-b border-gray-200 bg-white px-2',
        isProjectContent &&
          'relative z-10 h-14 shrink-0 border-gray-100 bg-gray-25 px-6 shadow-project-header'
      )}
    >
      <button
        type="button"
        aria-label="뒤로가기"
        onClick={onBack ?? (() => navigate(-1))}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-50',
          isProjectContent && '-ml-[15px] mr-[9px] rounded-none text-gray-900 hover:bg-transparent'
        )}
      >
        <ChevronLeft
          className={cn('h-5 w-5', isProjectContent && 'h-6 w-6')}
          strokeWidth={isProjectContent ? 2.2 : undefined}
          aria-hidden
        />
      </button>

      <h1
        className={cn(
          'min-w-0 flex-1 truncate px-2 text-body-sm font-semibold text-gray-900',
          isProjectContent && 'px-0 text-title leading-7'
        )}
      >
        {title}
      </h1>

      {isProjectContent ? (
        (onNotificationClick || onSettingsClick) && (
          <div className="-mr-2 ml-4 flex shrink-0 items-center gap-1">
            {onNotificationClick && (
              <button
                type="button"
                aria-label="알림"
                onClick={onNotificationClick}
                className="flex h-10 w-10 items-center justify-center text-gray-500"
              >
                <Bell className="h-[22px] w-[22px]" aria-hidden />
              </button>
            )}
            {onSettingsClick && (
              <button
                type="button"
                aria-label="프로젝트 설정"
                onClick={onSettingsClick}
                className="flex h-10 w-10 items-center justify-center text-gray-500"
              >
                <span className="relative inline-flex">
                  <Settings className="h-6 w-6" aria-hidden />
                  {hasSettingsUpdate && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 h-1 w-1 rounded-full bg-error"
                    />
                  )}
                </span>
              </button>
            )}
          </div>
        )
      ) : onSettingsClick ? (
        <button
          type="button"
          aria-label="프로젝트 설정"
          onClick={onSettingsClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50"
        >
          <span className="relative inline-flex">
            <Settings className="h-5 w-5" aria-hidden />
            {hasSettingsUpdate && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-1 w-1 rounded-full bg-red-600"
              />
            )}
          </span>
        </button>
      ) : (
        <span className="h-10 w-10 shrink-0" aria-hidden />
      )}
    </header>
  )
}
