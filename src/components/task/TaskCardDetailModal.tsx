import { CalendarDays, FileText, Info, Link, TriangleAlert, UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { BottomSheet } from '../Modal'
import { Button } from '../Button'
import { cn } from '../../lib/utils'
import type { Task, TaskStatus } from '../../types/task'
import {
  getTaskDaysRemaining,
  isTaskDueSoon,
  isTaskOverdue,
  parseTaskDate,
} from '../../utils/taskDate'
import { TASK_BADGE_BASE_CLASS, TASK_CATEGORY_CONFIG } from './taskCategoryConfig'

interface TaskCardDetailModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onComplete: (task: Task) => void
}

const statusLabels: Record<TaskStatus, string> = {
  todo: '예정',
  inProgress: '진행 중',
  done: '완료',
}

function formatDueDate(value: string) {
  const date = parseTaskDate(value)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

export function TaskCardDetailModal({
  open,
  task,
  onClose,
  onEdit,
  onDelete,
  onComplete,
}: TaskCardDetailModalProps) {
  if (!task) return null

  const overdue = isTaskOverdue(task)
  const dueSoon = isTaskDueSoon(task)
  const daysRemaining = getTaskDaysRemaining(task)
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === task.assignee.avatarId)
  const avatarSrc = task.assignee.avatarImageUrl ?? avatarPreset?.src
  const attachments = task.attachments ?? []
  const category = TASK_CATEGORY_CONFIG[task.category]

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[calc(100svh-7rem)] overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-gray-900">업무카드 상세</h2>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={() => onEdit(task)} className="h-7 px-2.5 text-caption leading-none bg-gray-100 text-gray-400">
              수정
            </Button>
            <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={() => onDelete(task)} className="h-7 px-2.5 text-caption leading-none bg-error/10 text-error hover:bg-error/20">
              삭제
            </Button>
          </div>
        </div>

        {dueSoon && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-caption text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일이 {daysRemaining === 0 ? '오늘이에요' : `${daysRemaining}일 남았어요`}
          </div>
        )}
        {overdue && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-caption text-error">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일이 지났어요
          </div>
        )}

        <div className="mt-5 border-b border-gray-200 pb-4">
          <p className="text-body-sm text-gray-600">업무명</p>
          <h3 className="mt-2 text-title font-bold text-gray-900">{task.title}</h3>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <dt className="text-body-sm text-gray-600">담당자</dt>
            <dd className="mt-2 flex items-center gap-2 text-body-sm text-gray-700">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-4 w-4 text-gray-400" aria-hidden />
                )}
              </span>
              {task.assignee.nickname}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-gray-600">상태</dt>
            <dd className="mt-2">
              <span className={cn(TASK_BADGE_BASE_CLASS, 'bg-primary-100 text-primary')}>
                {statusLabels[task.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-gray-600">담당 영역</dt>
            <dd className="mt-2">
              <span className={cn(TASK_BADGE_BASE_CLASS, category.className)}>
                {category.label}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-gray-600">마감일</dt>
            <dd className={cn('mt-2 flex items-center gap-1 text-body-sm text-gray-700', overdue && 'text-error', dueSoon && 'text-warning')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDueDate(task.dueDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <h3 className="text-body-sm text-gray-600">첨부 자료</h3>
          {attachments.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              {attachments.map((attachment) => {
                const AttachmentIcon = attachment.type === 'link' ? Link : FileText
                const content = (
                  <>
                    <AttachmentIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-primary-700">{attachment.name}</span>
                    <span className="text-caption font-normal text-gray-400">{attachment.type === 'link' ? '링크' : attachment.size}</span>
                  </>
                )

                return attachment.type === 'link' && attachment.url ? (
                  <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                    {content}
                  </a>
                ) : (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                    {content}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-body-sm text-gray-400">첨부 자료가 없어요</p>
          )}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-caption font-normal text-primary-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            첨부 산출물과 업무 완료 여부가 기여도 분석 시 교차 검증됩니다. 파일 첨부만으로 기여도가 높아지지 않습니다.
          </span>
        </p>

        <div className="mt-5 flex gap-3">
          <Button type="button" variant="ghost" fullWidth={false} onClick={() => onEdit(task)} className="flex-1 bg-gray-100 text-gray-400">
            파일 추가
          </Button>
          <Button
            type="button"
            fullWidth={false}
            disabled={task.status === 'done'}
            onClick={() => onComplete(task)}
            className="flex-[2] text-white"
          >
            {task.status === 'done' ? '완료됨' : '완료 처리'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
