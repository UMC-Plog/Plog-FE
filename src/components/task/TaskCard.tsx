import { CalendarDays, Paperclip, UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { cn } from '../../lib/utils'
import type { ServerProfilePreset, TaskListItemViewModel } from '../../types/task'
import { getTaskDueDateInfo, parseTaskDate } from '../../utils/taskDate'
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
  const dueDateInfo = getTaskDueDateInfo(task.dueDate)
  const isDueSoon =
    task.status !== 'DONE' &&
    !task.isOverdue &&
    (dueDateInfo.state === 'TODAY' ||
      (dueDateInfo.state === 'UPCOMING' && dueDateInfo.daysUntilDue <= 3))
  const avatarId = task.assignee.profilePreset
    ? PROFILE_PRESET_TO_AVATAR_ID[task.assignee.profilePreset]
    : undefined
  const avatarSrc = AVATAR_PRESETS.find((avatar) => avatar.id === avatarId)?.src

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className={cn(
        'flex min-h-[110px] w-full flex-col gap-2 rounded-12 border border-transparent bg-gray-25 p-4 text-left shadow-task-card transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        task.isOverdue && 'border-error'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-[14px] font-normal leading-5 text-gray-900">
          {task.title}
        </h3>
        <span
          className={cn(
            TASK_BADGE_BASE_CLASS,
            'shrink-0 whitespace-nowrap',
            category.className
          )}
        >
          {category.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[12px] font-normal leading-4 text-gray-400">
        <span className="flex items-center gap-1">
          <Paperclip className="h-[13px] w-[13px]" aria-hidden />
          {task.attachmentCount}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            task.isOverdue && 'font-semibold text-error',
            isDueSoon && 'font-semibold text-warning'
          )}
        >
          <CalendarDays className="h-[13px] w-[13px]" aria-hidden />
          {task.isOverdue ? '마감초과' : formatDueDate(task.dueDate)}
        </span>
      </div>

      <div className="flex items-center gap-[7px]">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4 text-gray-400" aria-hidden />
          )}
        </div>
        <span className="min-w-0 truncate text-[12px] font-normal leading-4 text-gray-500">
          {task.assignee.nickname ?? '알 수 없는 사용자'}
        </span>
      </div>
    </button>
  )
}
