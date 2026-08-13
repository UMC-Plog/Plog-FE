import { CalendarDays, Info, TriangleAlert, UserRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { AttachmentList } from '../attachment/AttachmentList'
import { AttachmentPicker } from '../attachment/AttachmentPicker'
import { BottomSheet } from '../Modal'
import { Button } from '../Button'
import {
  getAttachmentDraftSummary,
  toNewAttachmentRequests,
} from '../../lib/attachment'
import { cn } from '../../lib/utils'
import {
  MAX_ATTACHMENTS,
  type AttachmentDraft,
  type NewAttachmentRequest,
} from '../../types/attachment'
import type {
  ServerProfilePreset,
  ServerTaskStatus,
  TaskDetailViewModel,
} from '../../types/task'
import {
  getTaskDueDateInfo,
  parseTaskDate,
} from '../../lib/taskDate'
import type { NormalizedAttachment } from '../../types/attachment'
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
  onAddAttachment: (request: NewAttachmentRequest) => Promise<void>
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

function normalizeTaskAttachments(
  task: TaskDetailViewModel
): NormalizedAttachment[] {
  return task.attachments.map((attachment) =>
    attachment.type === 'FILE'
      ? {
          attachmentId: attachment.id,
          attachmentType: 'FILE',
          fileName: attachment.fileName,
          fileSize: null,
          downloadUrlApi: attachment.downloadUrlApi ?? null,
        }
      : {
          attachmentId: attachment.id,
          attachmentType: 'LINK',
          fileName: attachment.fileName,
          linkUrl: attachment.linkUrl!,
        }
  )
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
  onAddAttachment,
  isStatusUpdating,
  isDeleting,
  onStatusChange,
}: TaskCardDetailModalProps) {
  const [pendingStatus, setPendingStatus] =
    useState<ServerTaskStatus | null>(null)
  const attachmentDraftsRef = useRef<AttachmentDraft[]>([])
  const isCommittingAttachmentRef = useRef(false)
  const activeTaskIdRef = useRef<number | null>(null)
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([])
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false)
  const [isCommittingAttachment, setIsCommittingAttachment] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string>()
  const avatarId = task?.assignee.profilePreset
    ? PROFILE_PRESET_TO_AVATAR_ID[task.assignee.profilePreset]
    : undefined
  const avatarSrc = AVATAR_PRESETS.find((avatar) => avatar.id === avatarId)?.src
  const category = task ? SERVER_TASK_CATEGORY_CONFIG[task.category] : null
  const normalizedAttachments = task
    ? normalizeTaskAttachments(task)
    : []
  const dueDateInfo = task
    ? getTaskDueDateInfo(task.dueDate)
    : null
  const deadlineNotice = task?.isOverdue
    ? 'OVERDUE'
    : task?.status === 'DONE'
      ? null
      : dueDateInfo?.state === 'TODAY'
        ? 'TODAY'
        : dueDateInfo?.state === 'UPCOMING' &&
            dueDateInfo.daysUntilDue <= 3
          ? 'UPCOMING'
          : null
  const showWarningNotice =
    deadlineNotice === 'TODAY' || deadlineNotice === 'UPCOMING'

  const removeAttachmentDraft = useCallback((localId: string) => {
    const nextDrafts = attachmentDraftsRef.current.filter(
      (draft) => draft.localId !== localId
    )
    attachmentDraftsRef.current = nextDrafts
    setAttachmentDrafts(nextDrafts)
  }, [])

  const commitReadyAttachments = useCallback(async () => {
    if (isCommittingAttachmentRef.current) return

    isCommittingAttachmentRef.current = true
    setIsCommittingAttachment(true)
    try {
      while (true) {
        const readyDraft = attachmentDraftsRef.current.find(
          (draft) =>
            draft.source === 'NEW' &&
            (draft.attachmentType === 'LINK' || draft.status === 'SUCCESS')
        )
        if (!readyDraft) break

        const [request] = toNewAttachmentRequests([readyDraft])
        if (!request) break

        try {
          await onAddAttachment(request)
          removeAttachmentDraft(readyDraft.localId)
          setAttachmentError(undefined)
        } catch (error: unknown) {
          removeAttachmentDraft(readyDraft.localId)
          setAttachmentError(
            error instanceof Error
              ? error.message
              : '업무 첨부를 추가하지 못했습니다.'
          )
        }
      }
    } finally {
      isCommittingAttachmentRef.current = false
      setIsCommittingAttachment(false)
    }
  }, [onAddAttachment, removeAttachmentDraft])

  const changeAttachmentDrafts = useCallback((nextDrafts: AttachmentDraft[]) => {
    attachmentDraftsRef.current = nextDrafts
    setAttachmentDrafts(nextDrafts)
    setAttachmentError(undefined)
    void commitReadyAttachments()
  }, [commitReadyAttachments])

  useEffect(() => {
    if (!open) {
      activeTaskIdRef.current = null
      attachmentDraftsRef.current = []
      setAttachmentDrafts([])
      setIsAttachmentPickerOpen(false)
      setAttachmentError(undefined)
      return
    }
    if (task && activeTaskIdRef.current !== task.id) {
      activeTaskIdRef.current = task.id
      attachmentDraftsRef.current = []
      setAttachmentDrafts([])
      setIsAttachmentPickerOpen(false)
      setAttachmentError(undefined)
    }
  }, [open, task])

  useEffect(() => {
    void commitReadyAttachments()
  }, [attachmentDrafts, commitReadyAttachments])

  const existingAttachmentCount = task?.attachments.length ?? 0
  const remainingAttachmentCount = Math.max(
    0,
    MAX_ATTACHMENTS - existingAttachmentCount
  )
  const attachmentDraftSummary = getAttachmentDraftSummary(attachmentDrafts)
  const isAttachmentProcessing =
    isCommittingAttachment || attachmentDraftSummary.hasPendingUploads
  return (
    <BottomSheet
      open={open}
      onClose={
        isStatusUpdating || isDeleting || isAttachmentProcessing
          ? undefined
          : onClose
      }
      variant="task"
      closeOnHandleClick
      handleCloseLabel="업무카드 상세 바텀시트 닫기"
      contentClassName="h-[min(740px,100dvh)] pb-[max(1.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-full max-h-[calc(100dvh-4.75rem)] min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-[22px] font-semibold leading-8 text-gray-900">업무카드 상세</h2>
          {task && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" fullWidth={false} disabled={isStatusUpdating || isDeleting || isAttachmentProcessing} onClick={onEdit} className="h-8 rounded-md bg-gray-100 px-4 text-caption leading-none text-gray-400">
                수정
              </Button>
              <Button type="button" variant="ghost" size="sm" fullWidth={false} disabled={isStatusUpdating || isDeleting || isAttachmentProcessing} onClick={onDelete} className="h-8 rounded-md bg-error/10 px-4 text-caption leading-none text-error hover:bg-error/20">
                삭제
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <p className="py-16 text-center text-body-sm text-gray-400">
              업무 상세를 불러오는 중이에요.
            </p>
          </div>
        ) : error ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-12 text-center">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {deadlineNotice === 'OVERDUE' ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-caption text-error">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일이 지났어요
          </div>
        ) : deadlineNotice === 'TODAY' ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-caption text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일이 오늘이에요
          </div>
        ) : deadlineNotice === 'UPCOMING' ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-caption text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            마감일까지 {dueDateInfo?.daysUntilDue}일 남았어요
          </div>
        ) : null}

        <div className="mt-4 border-b border-gray-200 pb-4">
          <p className="text-body-sm text-gray-600">업무명</p>
          <h3 className="mt-2 text-[22px] font-semibold leading-8 text-gray-900">{task.title}</h3>
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
            <dd className={cn('mt-2 flex items-center gap-1 text-body-sm text-gray-700', deadlineNotice === 'OVERDUE' && 'text-error', showWarningNotice && 'text-warning')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              {formatDueDate(task.dueDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <h3 className="text-body-sm text-gray-600">첨부 자료</h3>
          <AttachmentList
            attachments={normalizedAttachments}
            variant="taskDetail"
            className="mt-2"
            emptyContent={
              <p className="mt-2 text-body-sm text-gray-400">
                첨부 자료가 없어요
              </p>
            }
          />
        </div>

        {task.status === 'IN_PROGRESS' && isAttachmentPickerOpen && (
          <div className="mt-4">
            <AttachmentPicker
              value={attachmentDrafts}
              onChange={changeAttachmentDrafts}
              usage="TASK"
              maxAttachments={remainingAttachmentCount}
              variant="task"
              disabled={isCommittingAttachment || remainingAttachmentCount === 0}
            />
            {attachmentError && (
              <p className="mt-2 text-caption font-normal text-error">
                {attachmentError}
              </p>
            )}
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-12 bg-primary-50 p-3 text-caption font-normal text-primary-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            첨부 산출물과 업무 완료 여부가 기여도 분석 시 교차 검증됩니다. 파일 첨부만으로 기여도가 높아지지 않습니다.
          </span>
        </p>
        </div>

        {task.status === 'TODO' ? (
          <div className="mt-5 flex shrink-0 gap-3 bg-white">
            <Button
              type="button"
              size="lg"
              fullWidth={false}
              loading={
                isStatusUpdating && pendingStatus === 'IN_PROGRESS'
              }
              disabled={isStatusUpdating || isCommittingAttachment}
              onClick={() => {
                setPendingStatus('IN_PROGRESS')
                onStatusChange('IN_PROGRESS')
              }}
              className="flex-1 text-white"
            >
              진행중
            </Button>
            <Button
              type="button"
              size="lg"
              fullWidth={false}
              loading={isStatusUpdating && pendingStatus === 'DONE'}
              disabled={isStatusUpdating || isCommittingAttachment}
              onClick={() => {
                setPendingStatus('DONE')
                onStatusChange('DONE')
              }}
              className="flex-1 text-white"
            >
              완료 처리
            </Button>
          </div>
        ) : task.status === 'IN_PROGRESS' ? (
          <div className="mt-5 flex shrink-0 gap-3 bg-white">
            {isAttachmentPickerOpen ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth={false}
                  disabled={isAttachmentProcessing}
                  onClick={() => setIsAttachmentPickerOpen(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="lg"
                  fullWidth={false}
                  disabled={isAttachmentProcessing}
                  onClick={() => setIsAttachmentPickerOpen(false)}
                  className="flex-[2] text-white"
                >
                  첨부완료
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth={false}
                  disabled={
                    isStatusUpdating ||
                    isCommittingAttachment ||
                    remainingAttachmentCount === 0
                  }
                  onClick={() => {
                    setAttachmentError(undefined)
                    setIsAttachmentPickerOpen(true)
                  }}
                  className="flex-1"
                >
                  파일추가
                </Button>
                <Button
                  type="button"
                  size="lg"
                  fullWidth={false}
                  loading={isStatusUpdating && pendingStatus === 'DONE'}
                  disabled={isStatusUpdating || isCommittingAttachment}
                  onClick={() => {
                    setPendingStatus('DONE')
                    onStatusChange('DONE')
                  }}
                  className="flex-[2] text-white"
                >
                  완료 처리
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-5 shrink-0 bg-white">
            <Button type="button" size="lg" disabled>
              이미 완료된 업무입니다
            </Button>
          </div>
        )}
          </>
        ) : null}
      </div>
    </BottomSheet>
  )
}
