import { ChevronDown, Info, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  addTaskAttachment,
  createTask,
  deleteTaskAttachment,
  fetchActiveProjectMembers,
  updateTask,
  updateTaskStatus,
} from '../../api/task'
import { AttachmentPicker } from '../attachment/AttachmentPicker'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { Button } from '../Button'
import { Input } from '../Input'
import { AlertModal, BottomSheet } from '../Modal'
import { cn } from '../../lib/utils'
import {
  getAttachmentDraftSummary,
  toNewAttachmentRequests,
} from '../../lib/attachment'
import type { ProjectType } from '../../types/project'
import type { AttachmentDraft } from '../../types/attachment'
import type {
  ProjectActiveMember,
  ServerAttachmentResponse,
  ServerProfilePreset,
  ServerTaskCategory,
  ServerTaskStatus,
  ServerTaskUpdateRequest,
  TaskDetailViewModel,
} from '../../types/task'

interface TaskCardFormModalProps {
  open: boolean
  projectId: number
  projectType?: ProjectType
  projectEndDate?: string
  task?: TaskDetailViewModel | null
  onClose: () => void
  onSaved: () => void
}

interface TaskEditBaseline {
  title: string
  projectMemberId: number
  category: ServerTaskCategory
  status: ServerTaskStatus
  endDate: string
  attachmentIds: number[]
}

const STATUS_OPTIONS: Array<{ value: ServerTaskStatus; label: string }> = [
  { value: 'TODO', label: '예정' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'DONE', label: '완료' },
]

const DEVELOP_CATEGORIES: Array<{
  value: ServerTaskCategory
  label: string
}> = [
  { value: 'PLANNING', label: '기획' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'DEVELOP', label: '개발' },
  { value: 'TEST_FIX', label: '테스트·수정' },
  { value: 'PRESENTATION_DOC', label: '발표 자료' },
  { value: 'ETC', label: '기타' },
]

const GENERAL_CATEGORIES: Array<{
  value: ServerTaskCategory
  label: string
}> = [
  { value: 'RESEARCH', label: '자료 조사' },
  { value: 'MATERIAL_PRODUCTION', label: '자료 제작' },
  { value: 'PRESENTATION', label: '발표' },
  { value: 'SCHEDULE_MANAGEMENT', label: '일정 관리' },
  { value: 'ETC', label: '기타' },
]

const TASK_META_FIELD_CLASS =
  'box-border h-12 min-h-12 w-full min-w-0 max-w-full rounded-md px-3.5 text-body leading-[1.5]'

const PRESET_ID: Record<ServerProfilePreset, string> = {
  OTTER: 'otter',
  PENGUIN: 'penguin',
  FROG: 'frog',
  KOALA: 'koala',
  PANDA: 'panda',
  SMILEY: 'smile',
  GHOST: 'ghost',
  TIGER: 'tiger',
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
}

function isAfterProjectEndDate(endDate: string, projectEndDate?: string) {
  if (!projectEndDate) return false
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  return (
    datePattern.test(endDate) &&
    datePattern.test(projectEndDate) &&
    endDate > projectEndDate
  )
}

function mapTaskAttachments(task: TaskDetailViewModel): AttachmentDraft[] {
  return task.attachments.map((attachment) =>
    attachment.type === 'FILE'
      ? {
          localId: `task-server-${attachment.id}`,
          source: 'SERVER',
          attachmentType: 'FILE',
          attachmentId: attachment.id,
          fileId: attachment.fileId,
          fileName: attachment.fileName,
          downloadUrlApi: attachment.downloadUrlApi,
        }
      : {
          localId: `task-server-${attachment.id}`,
          source: 'SERVER',
          attachmentType: 'LINK',
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          linkUrl: attachment.linkUrl!,
        }
  )
}

function mapAddedTaskAttachment(
  attachment: ServerAttachmentResponse
): AttachmentDraft {
  return attachment.attachmentType === 'FILE'
    ? {
        localId: `task-server-${attachment.taskAttachmentId!}`,
        source: 'SERVER',
        attachmentType: 'FILE',
        attachmentId: attachment.taskAttachmentId!,
        fileId: attachment.fileId,
        fileName: attachment.fileName!,
        downloadUrlApi: attachment.downloadUrlApi,
      }
    : {
        localId: `task-server-${attachment.taskAttachmentId!}`,
        source: 'SERVER',
        attachmentType: 'LINK',
        attachmentId: attachment.taskAttachmentId!,
        fileName: attachment.fileName!,
        linkUrl: attachment.linkUrl!,
      }
}

export function TaskCardFormModal({
  open,
  projectId,
  projectType,
  projectEndDate,
  task,
  onClose,
  onSaved,
}: TaskCardFormModalProps) {
  const isEditMode = Boolean(task)
  const requestIdRef = useRef(0)
  const submittingRef = useRef(false)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)
  const assigneeTriggerRef = useRef<HTMLButtonElement>(null)
  const categoryDropdownRef = useRef<HTMLSpanElement>(null)
  const categoryTriggerRef = useRef<HTMLButtonElement>(null)
  const [members, setMembers] = useState<ProjectActiveMember[]>([])
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string>()
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectMemberId, setProjectMemberId] = useState<number | null>(null)
  const [status, setStatus] = useState<ServerTaskStatus>('TODO')
  const [category, setCategory] = useState<ServerTaskCategory | ''>('')
  const [endDate, setEndDate] = useState('')
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const [isDeadlineAlertOpen, setIsDeadlineAlertOpen] = useState(false)
  const [editBaseline, setEditBaseline] = useState<TaskEditBaseline | null>(null)

  const categories = useMemo(
    () =>
      projectType === 'DEVELOPMENT'
        ? DEVELOP_CATEGORIES
        : projectType === 'GENERAL'
          ? GENERAL_CATEGORIES
          : [],
    [projectType]
  )

  const loadMembers = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setMembers([])
    setIsMembersLoading(true)
    setMembersError(undefined)
    setIsAssigneeDropdownOpen(false)

    try {
      const response = await fetchActiveProjectMembers(projectId)
      if (requestId === requestIdRef.current) setMembers(response)
    } catch (error: unknown) {
      if (requestId === requestIdRef.current) {
        setMembersError(getErrorMessage(error))
      }
    } finally {
      if (requestId === requestIdRef.current) setIsMembersLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1
      return
    }

    setTitle(task?.title ?? '')
    setProjectMemberId(task?.assignee.projectMemberId ?? null)
    setStatus(task?.status ?? 'TODO')
    setCategory(task?.category ?? '')
    setEndDate(task?.dueDate ?? '')
    setAttachments(task ? mapTaskAttachments(task) : [])
    setIsAssigneeDropdownOpen(false)
    setIsCategoryDropdownOpen(false)
    setEditBaseline(
      task
        ? {
            title: task.title,
            projectMemberId: task.assignee.projectMemberId,
            category: task.category,
            status: task.status,
            endDate: task.dueDate,
            attachmentIds: task.attachments.map(
              (attachment) => attachment.id
            ),
          }
        : null
    )
    setIsSubmitting(false)
    setSubmitError(undefined)
    setIsDeadlineAlertOpen(false)
    submittingRef.current = false
    void loadMembers()

    return () => {
      requestIdRef.current += 1
    }
  }, [loadMembers, open, task])

  useEffect(() => {
    if (!open) return

    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const bodyStyle = document.body.style
    const documentStyle = document.documentElement.style
    const previousBodyStyles = {
      overflow: bodyStyle.overflow,
      overscrollBehavior: bodyStyle.overscrollBehavior,
      position: bodyStyle.position,
      top: bodyStyle.top,
      width: bodyStyle.width,
    }
    const previousDocumentStyles = {
      overflow: documentStyle.overflow,
      overscrollBehavior: documentStyle.overscrollBehavior,
    }

    bodyStyle.overflow = 'hidden'
    bodyStyle.overscrollBehavior = 'none'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.width = '100%'
    documentStyle.overflow = 'hidden'
    documentStyle.overscrollBehavior = 'none'

    return () => {
      bodyStyle.overflow = previousBodyStyles.overflow
      bodyStyle.overscrollBehavior = previousBodyStyles.overscrollBehavior
      bodyStyle.position = previousBodyStyles.position
      bodyStyle.top = previousBodyStyles.top
      bodyStyle.width = previousBodyStyles.width
      documentStyle.overflow = previousDocumentStyles.overflow
      documentStyle.overscrollBehavior =
        previousDocumentStyles.overscrollBehavior
      window.scrollTo(scrollX, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!isAssigneeDropdownOpen && !isCategoryDropdownOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (
        isAssigneeDropdownOpen &&
        !assigneeDropdownRef.current?.contains(target)
      ) {
        setIsAssigneeDropdownOpen(false)
      }
      if (
        isCategoryDropdownOpen &&
        !categoryDropdownRef.current?.contains(target)
      ) {
        setIsCategoryDropdownOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isAssigneeDropdownOpen, isCategoryDropdownOpen])

  useEffect(() => {
    if (category && !categories.some((option) => option.value === category)) {
      setCategory('')
    }
  }, [categories, category])

  const normalizedTitle = title.trim()
  const selectedMember = members.find(
    (member) => member.projectMemberId === projectMemberId
  )
  const selectedCategory = categories.find(
    (option) => option.value === category
  )
  const selectedMemberAvatar = selectedMember?.profilePreset
    ? AVATAR_PRESETS.find(
        (avatar) => avatar.id === PRESET_ID[selectedMember.profilePreset!]
      )
    : undefined
  const hasGeneralChanges = Boolean(
    editBaseline &&
      (normalizedTitle !== editBaseline.title ||
        projectMemberId !== editBaseline.projectMemberId ||
        category !== editBaseline.category ||
        endDate !== editBaseline.endDate)
  )
  const hasStatusChanges = Boolean(
    editBaseline && status !== editBaseline.status
  )
  const currentServerAttachmentIds = attachments.flatMap((attachment) =>
    attachment.source === 'SERVER' ? [attachment.attachmentId] : []
  )
  const hasAttachmentChanges = Boolean(
    editBaseline &&
      (attachments.some((attachment) => attachment.source === 'NEW') ||
        editBaseline.attachmentIds.some(
          (attachmentId) =>
            !currentServerAttachmentIds.includes(attachmentId)
        ))
  )
  const attachmentSummary = useMemo(
    () => getAttachmentDraftSummary(attachments),
    [attachments]
  )
  const hasChanges =
    hasGeneralChanges || hasStatusChanges || hasAttachmentChanges
  const canSubmit = Boolean(
    normalizedTitle.length >= 2 &&
      selectedMember &&
      category &&
      status &&
      endDate &&
      projectType &&
      (!isEditMode || hasChanges) &&
      !isMembersLoading &&
      !attachmentSummary.hasPendingUploads &&
      !attachmentSummary.hasUploadErrors &&
      !isSubmitting
  )

  const submit = async () => {
    if (
      !canSubmit ||
      !selectedMember ||
      !category ||
      submittingRef.current
    ) {
      return
    }

    const hasChangedEndDate =
      !isEditMode || Boolean(editBaseline && endDate !== editBaseline.endDate)
    if (
      hasChangedEndDate &&
      isAfterProjectEndDate(endDate, projectEndDate)
    ) {
      setIsDeadlineAlertOpen(true)
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(undefined)

    try {
      if (task && editBaseline) {
        const payload: ServerTaskUpdateRequest = {}
        if (normalizedTitle !== editBaseline.title) {
          payload.title = normalizedTitle
        }
        if (selectedMember.projectMemberId !== editBaseline.projectMemberId) {
          payload.projectMemberId = selectedMember.projectMemberId
        }
        if (category !== editBaseline.category) payload.category = category
        if (endDate !== editBaseline.endDate) payload.endDate = endDate

        let generalUpdateSucceeded = false
        if (hasGeneralChanges) {
          await updateTask(projectId, task.id, payload)
          generalUpdateSucceeded = true
          setEditBaseline((current) =>
            current
              ? {
                  ...current,
                  title: normalizedTitle,
                  projectMemberId: selectedMember.projectMemberId,
                  category,
                  endDate,
                }
              : current
          )
        }

        if (hasStatusChanges) {
          try {
            await updateTaskStatus(projectId, task.id, {
              cardStatus: status,
            })
            setEditBaseline((current) =>
              current ? { ...current, status } : current
            )
          } catch (error: unknown) {
            if (generalUpdateSucceeded) {
              onSaved()
              setSubmitError(
                '업무 정보는 수정됐지만 상태 변경에 실패했습니다. 다시 확인해주세요.'
              )
              submittingRef.current = false
              setIsSubmitting(false)
              return
            }
            throw error
          }
        }

        if (hasAttachmentChanges) {
          const removedAttachmentIds = editBaseline.attachmentIds.filter(
            (attachmentId) =>
              !currentServerAttachmentIds.includes(attachmentId)
          )
          const newAttachments = attachments.filter(
            (attachment) => attachment.source === 'NEW'
          )
          try {
            for (const attachmentId of removedAttachmentIds) {
              await deleteTaskAttachment(
                projectId,
                task.id,
                attachmentId
              )
              setEditBaseline((current) =>
                current
                  ? {
                      ...current,
                      attachmentIds: current.attachmentIds.filter(
                        (id) => id !== attachmentId
                      ),
                    }
                  : current
              )
            }
            for (const draft of newAttachments) {
              const [request] = toNewAttachmentRequests([draft])
              if (!request) continue
              const added = await addTaskAttachment(
                projectId,
                task.id,
                request
              )
              const mappedAttachment = mapAddedTaskAttachment(added)
              setAttachments((current) =>
                current.map((attachment) =>
                  attachment.localId === draft.localId
                    ? mappedAttachment
                    : attachment
                )
              )
              setEditBaseline((current) =>
                current
                  ? {
                      ...current,
                      attachmentIds: [
                        ...current.attachmentIds,
                        added.taskAttachmentId!,
                      ],
                    }
                  : current
              )
            }
          } catch (error: unknown) {
            onSaved()
            setSubmitError(
              `일부 첨부 변경에 실패했습니다. 최신 업무를 다시 확인해 주세요. ${getErrorMessage(error)}`
            )
            submittingRef.current = false
            setIsSubmitting(false)
            return
          }
        }
      } else {
        const attachmentRequests = toNewAttachmentRequests(attachments)
        await createTask(projectId, {
          title: normalizedTitle,
          projectMemberId: selectedMember.projectMemberId,
          category,
          cardStatus: status,
          endDate,
          ...(attachmentRequests.length > 0
            ? { attachments: attachmentRequests }
            : {}),
        })
      }
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error))
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      variant="task"
      closeOnHandleClick
      handleCloseLabel="업무카드 바텀시트 닫기"
      contentClassName="h-[min(740px,100dvh)] pb-[max(1.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-full max-h-[calc(100dvh-4.75rem)] min-h-0 flex-col overflow-hidden">
        <h2 className="shrink-0 text-h3 text-gray-900">
          {isEditMode ? '업무카드 수정' : '업무카드 등록'}
        </h2>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none pr-1">
          <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-body-sm font-medium text-gray-700"
            >
              업무명 <span className="text-error">*</span>
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setSubmitError(undefined)
              }}
              placeholder="수행할 업무를 입력하세요"
              maxLength={80}
              errorText={
                title.length > 0 && normalizedTitle.length < 2
                  ? '업무명은 2자 이상 입력해 주세요.'
                  : undefined
              }
            />
          </div>

          <fieldset className="min-w-0">
            <legend
              id="task-assignee-label"
              className="text-body-sm font-medium text-gray-700"
            >
              담당자 <span className="text-error">*</span>
            </legend>
            <div
              ref={assigneeDropdownRef}
              className="relative mt-2 min-w-0"
              onKeyDown={(event) => {
                if (event.key === 'Escape' && isAssigneeDropdownOpen) {
                  event.stopPropagation()
                  setIsAssigneeDropdownOpen(false)
                  assigneeTriggerRef.current?.focus()
                }
              }}
            >
              <button
                ref={assigneeTriggerRef}
                type="button"
                aria-labelledby="task-assignee-label"
                aria-haspopup="listbox"
                aria-expanded={isAssigneeDropdownOpen}
                aria-controls="task-assignee-options"
                disabled={
                  isMembersLoading ||
                  Boolean(membersError) ||
                  members.length === 0 ||
                  isSubmitting
                }
                onClick={() => {
                  setIsCategoryDropdownOpen(false)
                  setIsAssigneeDropdownOpen((isOpen) => !isOpen)
                }}
                className={cn(
                  'flex h-14 w-full min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-[18px] text-left text-body transition-colors',
                  'focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50',
                  selectedMember ? 'text-gray-700' : 'text-gray-400'
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  {selectedMember ? (
                    <>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {selectedMemberAvatar ? (
                          <img
                            src={selectedMemberAvatar.src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound
                            className="h-4 w-4 text-gray-400"
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="min-w-0 truncate">
                        {selectedMember.nickname}
                      </span>
                    </>
                  ) : (
                    <span className="truncate">팀원을 선택하세요</span>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                    isAssigneeDropdownOpen && 'rotate-180'
                  )}
                  aria-hidden
                />
              </button>

              {isAssigneeDropdownOpen && (
                <div
                  id="task-assignee-options"
                  role="listbox"
                  aria-labelledby="task-assignee-label"
                  className="absolute left-0 right-0 top-full z-20 mt-2 max-h-56 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
                >
                  {members.map((member) => {
                    const presetId = member.profilePreset
                      ? PRESET_ID[member.profilePreset]
                      : null
                    const avatar = AVATAR_PRESETS.find(
                      (item) => item.id === presetId
                    )
                    const selected =
                      member.projectMemberId === projectMemberId

                    return (
                      <button
                        key={member.projectMemberId}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setProjectMemberId(member.projectMemberId)
                          setIsAssigneeDropdownOpen(false)
                        }}
                        className={cn(
                          'flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left text-body-sm text-gray-700',
                          'focus:outline-none focus-visible:bg-primary-50 hover:bg-gray-50',
                          selected && 'bg-primary-50 text-primary'
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                          {avatar ? (
                            <img
                              src={avatar.src}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound
                              className="h-4 w-4 text-gray-400"
                              aria-hidden
                            />
                          )}
                        </span>
                        <span className="min-w-0 truncate">
                          {member.nickname}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {isMembersLoading ? (
              <p className="mt-2 text-caption font-normal text-gray-400">
                프로젝트 멤버를 불러오는 중이에요.
              </p>
            ) : membersError ? (
              <div className="mt-2 rounded-md bg-gray-50 p-3">
                <p className="text-caption font-normal text-error">
                  {membersError}
                </p>
                <Button
                  type="button"
                  size="sm"
                  fullWidth={false}
                  className="mt-2 text-white"
                  onClick={() => void loadMembers()}
                >
                  다시 시도
                </Button>
              </div>
            ) : members.length === 0 ? (
              <p className="mt-2 text-caption font-normal text-gray-400">
                선택할 수 있는 ACTIVE 멤버가 없어요.
              </p>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="text-body-sm font-medium text-gray-700">
              상태 <span className="text-error">*</span>
            </legend>
            <div className="mt-2 flex gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setStatus(option.value)
                    setSubmitError(undefined)
                  }}
                  aria-pressed={status === option.value}
                  className={cn(
                    'h-8 rounded-full border px-3 text-caption',
                    status === option.value
                      ? 'border-primary-100 bg-primary-100 text-primary'
                      : 'border-gray-200 bg-white font-normal text-gray-400'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div
            className={cn(
              'grid grid-cols-2 items-start gap-3',
              isCategoryDropdownOpen && 'pb-[12.5rem]'
            )}
          >
            <div className="block min-w-0 text-body-sm font-medium text-gray-700">
              <span id="task-category-label">
                담당 영역 <span className="text-error">*</span>
              </span>
              <span
                ref={categoryDropdownRef}
                className="relative mt-1.5 block"
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && isCategoryDropdownOpen) {
                    event.stopPropagation()
                    setIsCategoryDropdownOpen(false)
                    categoryTriggerRef.current?.focus()
                  }
                }}
              >
                <button
                  ref={categoryTriggerRef}
                  type="button"
                  aria-labelledby="task-category-label"
                  aria-haspopup="listbox"
                  aria-expanded={isCategoryDropdownOpen}
                  aria-controls="task-category-options"
                  disabled={categories.length === 0}
                  onClick={() => {
                    setIsAssigneeDropdownOpen(false)
                    setIsCategoryDropdownOpen((isOpen) => !isOpen)
                  }}
                  className={cn(
                    TASK_META_FIELD_CLASS,
                    'flex items-center justify-between border border-gray-200 bg-white pr-10 text-left focus:border-primary focus:outline-none disabled:bg-gray-50 disabled:text-gray-400',
                    selectedCategory ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {selectedCategory?.label ?? '영역 선택'}
                </button>
                <ChevronDown
                  className={cn(
                    'pointer-events-none absolute right-3.5 top-6 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform',
                    isCategoryDropdownOpen && 'rotate-180'
                  )}
                  aria-hidden
                />
                {isCategoryDropdownOpen && (
                  <span
                    id="task-category-options"
                    role="listbox"
                    aria-labelledby="task-category-label"
                    className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
                  >
                    {categories.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={category === option.value}
                        onClick={() => {
                          setCategory(option.value)
                          setIsCategoryDropdownOpen(false)
                        }}
                        className={cn(
                          'block w-full rounded-md px-3 py-2 text-left text-body-sm text-gray-700',
                          'focus:outline-none focus-visible:bg-primary-50 hover:bg-gray-50',
                          category === option.value &&
                            'bg-primary-50 text-primary'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </span>
                )}
              </span>
              {categories.length === 0 && (
                <span className="mt-1.5 block text-caption font-normal text-error">
                  프로젝트 유형을 확인할 수 없어요.
                </span>
              )}
            </div>

            <div className="min-w-0">
              <label
                htmlFor="task-due-date"
                className="mb-1.5 block text-body-sm font-medium text-gray-700"
              >
                마감일 <span className="text-error">*</span>
              </label>
              <div className="relative box-border h-12 w-full min-w-0 max-w-full rounded-md border border-gray-200 bg-white px-3.5 transition-colors duration-150 hover:border-gray-300 focus-within:border-primary [&>div]:h-full [&>div>div]:h-full">
                <Input
                  id="task-due-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-label="날짜 선택"
                  className={cn(
                    'box-border h-full min-h-0 w-full min-w-0 max-w-full rounded-none border-0 bg-transparent px-0 text-base leading-[1.5] hover:border-transparent focus:border-transparent sm:text-body',
                    endDate ? 'text-gray-900' : 'text-transparent'
                  )}
                />
                {!endDate && (
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base leading-[1.5] text-gray-400 sm:text-body">
                    날짜 선택
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-body-sm font-medium text-gray-700">첨부 자료</p>
            <div className="mt-2">
              <AttachmentPicker
                value={attachments}
                onChange={(nextAttachments) => {
                  setAttachments(nextAttachments)
                  setSubmitError(undefined)
                }}
                usage="TASK"
                variant="task"
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-caption font-normal text-primary-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block">
                  파일 첨부만으로 기여도가 높아지지 않아요
                </span>
                <span className="block">
                  담당 업무와 연결된 산출물이 리포트에 반영됩니다
                </span>
              </span>
            </p>
          </div>
          </div>

          {submitError && (
            <p className="mt-3 text-caption font-normal text-error">
              {submitError}
            </p>
          )}
        </div>

        <div className="mt-5 flex shrink-0 gap-3 bg-white">
          <Button
            type="button"
            variant="ghost"
            fullWidth={false}
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-400"
          >
            취소
          </Button>
          <Button
            type="button"
            fullWidth={false}
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="flex-[2] text-white"
          >
            {isSubmitting
              ? isEditMode
                ? '수정 중'
                : '등록 중'
              : isEditMode
                ? '업무 수정'
                : '업무 등록'}
          </Button>
        </div>
      </div>
      </BottomSheet>
      <AlertModal
        open={isDeadlineAlertOpen}
        variant="warning"
        title={isEditMode ? '업무카드 수정 불가' : '업무카드 등록 불가'}
        description={
          isEditMode ? (
            '예정 마감일 이후의 업무카드는 리포트에\n반영 불가해요'
          ) : (
            '예정 마감일 이후의 업무카드는\n리포트에 반영되지 않아 등록이 불가해요'
          )
        }
        onConfirm={() => setIsDeadlineAlertOpen(false)}
      />
    </>
  )
}
