import { CalendarDays, Paperclip, UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { cn } from '../../lib/utils'
import type { ServerProfilePreset, TaskListItemViewModel } from '../../types/task'
import { parseTaskDate } from '../../utils/taskDate'
import { SERVER_TASK_CATEGORY_CONFIG, TASK_BADGE_BASE_CLASS } from './taskCategoryConfig'

interface TaskCardProps {
  task: TaskListItemViewModel
  onClick?: (task: TaskListItemViewModel) => void
}

const PROFILE_PRESET_TO_AVATAR_ID: Record<ServerProfilePreset, string> = {
  OTTER: 'otter',
  PENGUIN: 'penguin',
  FROG: 'frog',
  KOALA: 'koala',
  PANDA: 'panda',
  SMILEY: 'smile',
  GHOST: 'ghost',
  TIGER: 'tiger',
}

function formatDueDate(value: string) {
  const date = parseTaskDate(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const category = SERVER_TASK_CATEGORY_CONFIG[task.category]
  const avatarId = task.assignee.profilePreset
    ? PROFILE_PRESET_TO_AVATAR_ID[task.assignee.profilePreset]
    : undefined
  const avatarSrc = AVATAR_PRESETS.find((avatar) => avatar.id === avatarId)?.src

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className={cn(
        'w-full rounded-lg border bg-white p-4 text-left shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        task.isOverdue ? 'border-error' : 'border-gray-100',
        onClick && 'hover:border-primary-200'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-body-sm font-semibold text-gray-900">
          {task.title}
        </h3>
        <span
          className={cn(
            TASK_BADGE_BASE_CLASS,
            'shrink-0 whitespace-nowrap px-2 py-0.5 text-caption',
            category.className
          )}
        >
          {category.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-caption font-normal text-gray-400">
        <span className="flex items-center gap-1">
          <Paperclip className="h-4 w-4" aria-hidden />
          {task.attachmentCount}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            task.isOverdue && 'font-semibold text-error'
          )}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          {task.isOverdue ? '마감초과' : formatDueDate(task.dueDate)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4 text-gray-400" aria-hidden />
          )}
        </div>
        <span className="min-w-0 truncate text-caption font-normal text-gray-500">
          {task.assignee.nickname}
        </span>
      </div>
    </button>
  )
}
