import { CalendarDays, FileText, Info, Link, TriangleAlert, UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { BottomSheet } from '../Modal'
import { Button } from '../Button'
import { cn } from '../../lib/utils'
import type {
  ServerProfilePreset,
  ServerTaskStatus,
  TaskDetailViewModel,
} from '../../types/task'
import { parseTaskDate } from '../../utils/taskDate'
import {
  SERVER_TASK_CATEGORY_CONFIG,
  TASK_BADGE_BASE_CLASS,
} from './taskCategoryConfig'

interface TaskCardDetailModalProps {
  open: boolean
  task: TaskDetailViewModel | null
  isLoading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
  onEdit: () => void
  onDelete: () => void
  onUnavailableAction: () => void
  isStatusUpdating: boolean
  isDeleting: boolean
  onStatusChange: (status: ServerTaskStatus) => void
}

const statusLabels: Record<ServerTaskStatus, string> = {
  TODO: '예정',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
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
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

export function TaskCardDetailModal({
  open,
  task,
  isLoading,
  error,
  onClose,
  onRetry,
  onEdit,
  onDelete,
  onUnavailableAction,
  isStatusUpdating,
  isDeleting,
  onStatusChange,
}: TaskCardDetailModalProps) {
  const avatarId = task?.assignee.profilePreset
    ? PROFILE_PRESET_TO_AVATAR_ID[task.assignee.profilePreset]
    : undefined
  const avatarSrc = AVATAR_PRESETS.find((avatar) => avatar.id === avatarId)?.src
  const category = task ? SERVER_TASK_CATEGORY_CONFIG[task.category] : null
  return (
    <BottomSheet
      open={open}
      onClose={isStatusUpdating || isDeleting ? undefined : onClose}
    >
      <div className="max-h-[calc(100svh-7rem)] overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3 text-gray-900">업무카드 상세</h2>
          {task && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" fullWidth={false} disabled={isStatusUpdating || isDeleting} onClick={onEdit} className="h-7 px-2.5 text-caption leading-none bg-gray-100 text-gray-400">
                수정
              </Button>
              <Button type="button" variant="ghost" size="sm" fullWidth={false} disabled={isStatusUpdating || isDeleting} onClick={onDelete} className="h-7 px-2.5 text-caption leading-none bg-error/10 text-error hover:bg-error/20">
                삭제
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-body-sm text-gray-400">
            업무 상세를 불러오는 중이에요.
          </p>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-body-sm text-error">{error}</p>
            <div className="mt-4 flex gap-3">
              <Button type="button" variant="ghost" fullWidth={false} onClick={onClose} className="flex-1 bg-gray-100 text-gray-500">
                닫기
              </Button>
              <Button type="button" fullWidth={false} onClick={onRetry} className="flex-1 text-white">
                다시 시도
              </Button>
            </div>
          </div>
        ) : task && category ? (
          <>
        {task.isImminent && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-caption text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일이 {task.dDay === 0 ? '오늘이에요' : `${task.dDay}일 남았어요`}
          </div>
        )}
        {task.isOverdue && (
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
              {task.assignee.nickname ?? '알 수 없는 사용자'}
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
            <dd className={cn('mt-2 flex items-center gap-1 text-body-sm text-gray-700', task.isOverdue && 'text-error', task.isImminent && 'text-warning')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDueDate(task.dueDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <h3 className="text-body-sm text-gray-600">첨부 자료</h3>
          {task.attachments.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              {task.attachments.map((attachment) => {
                const AttachmentIcon = attachment.type === 'LINK' ? Link : FileText
                return (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                    <AttachmentIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-primary-700">
                      {attachment.fileName}
                    </span>
                    <span className="text-caption font-normal text-gray-400">
                      {attachment.type === 'LINK' ? '링크' : '파일'}
                    </span>
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
          <Button type="button" variant="ghost" fullWidth={false} disabled={isStatusUpdating} onClick={onUnavailableAction} className="flex-1 bg-gray-100 text-gray-400">
            파일 추가
          </Button>
          {task.status !== 'DONE' ? (
            <Button
              type="button"
              fullWidth={false}
              loading={isStatusUpdating}
              disabled={isStatusUpdating}
              onClick={() =>
                onStatusChange(
                  task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'
                )
              }
              className="flex-[2] text-white"
            >
              {isStatusUpdating
                ? '변경 중'
                : task.status === 'TODO'
                  ? '진행 중'
                  : '완료 처리'}
            </Button>
          ) : (
            <Button
              type="button"
              fullWidth={false}
              disabled
              className="flex-[2] text-white"
            >
              완료됨
            </Button>
          )}
        </div>
          </>
        ) : null}
      </div>
    </BottomSheet>
  )
}
