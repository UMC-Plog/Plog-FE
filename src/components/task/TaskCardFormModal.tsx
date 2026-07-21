import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Info, Link, Paperclip, X } from 'lucide-react'
import { Button } from '../Button'
import { Input } from '../Input'
import { BottomSheet } from '../Modal'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useTaskStore } from '../../store/taskStore'
import type {
  Task,
  TaskAssignee,
  TaskAttachment,
  TaskCategory,
  TaskStatus,
} from '../../types/task'

interface TaskCardFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  task?: Task | null
  projectId: string
  onClose: () => void
  onSaved?: (task: Task) => void
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: '예정' },
  { value: 'inProgress', label: '진행 중' },
  { value: 'done', label: '완료' },
]

const CATEGORY_OPTIONS: Array<{ value: TaskCategory; label: string }> = [
  { value: 'document', label: '문서' },
  { value: 'design', label: '디자인' },
  { value: 'planning', label: '기획' },
  { value: 'development', label: '개발' },
  { value: 'test', label: '테스트/수정' },
]

const PREVIEW_ASSIGNEES: TaskAssignee[] = [
  { id: 'preview-banana', nickname: '바나나', avatarId: 'otter' },
  { id: 'preview-ggum', nickname: '곰곰', avatarId: 'ghost' },
]

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_FILE_EXTENSIONS = ['pdf', 'pptx', 'docx', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp']

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function getLinkName(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

export function TaskCardFormModal({
  open,
  mode,
  task,
  projectId,
  onClose,
  onSaved,
}: TaskCardFormModalProps) {
  const user = useAuthStore((state) => state.user)
  const createTask = useTaskStore((state) => state.createTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [category, setCategory] = useState<TaskCategory>('planning')
  const [dueDate, setDueDate] = useState('')
  const [isDateFocused, setIsDateFocused] = useState(false)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [linkValue, setLinkValue] = useState('')
  const [linkError, setLinkError] = useState('')
  const [attachmentError, setAttachmentError] = useState('')
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const assignees = useMemo(() => {
    const currentUser: TaskAssignee[] = user
      ? [{
          id: user.id,
          nickname: user.nickname,
          avatarId: user.avatarId ?? undefined,
          avatarImageUrl: user.avatarImageUrl ?? undefined,
        }]
      : []
    return [...currentUser, ...PREVIEW_ASSIGNEES].filter(
      (assignee, index, items) => items.findIndex((item) => item.id === assignee.id) === index
    )
  }, [user])

  useEffect(() => {
    if (!open) return
    setTitle(mode === 'edit' && task ? task.title : '')
    setAssigneeId(mode === 'edit' && task ? task.assignee.id : '')
    setStatus(mode === 'edit' && task ? task.status : 'todo')
    setCategory(mode === 'edit' && task ? task.category : 'planning')
    setDueDate(mode === 'edit' && task ? task.dueDate : '')
    setIsDateFocused(false)
    setAttachments(mode === 'edit' && task ? task.attachments ?? [] : [])
    setLinkValue('')
    setLinkError('')
    setAttachmentError('')
    setIsAttachmentMenuOpen(false)
    setIsLinkInputOpen(false)
    setSubmitting(false)
  }, [mode, open, task, user])

  const selectedAssignee = assignees.find((assignee) => assignee.id === assigneeId)
    ?? (task?.assignee.id === assigneeId ? task.assignee : undefined)
  const canSubmit = Boolean(
    title.trim() && selectedAssignee && status && category && dueDate && !submitting
  )

  const addLink = () => {
    const value = linkValue.trim()
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
      setAttachments((items) => [
        ...items,
        { id: crypto.randomUUID(), type: 'link', name: getLinkName(value), url: value },
      ])
      setLinkValue('')
      setLinkError('')
      setIsLinkInputOpen(false)
    } catch {
      setLinkError('http 또는 https 주소를 입력해주세요')
    }
  }

  const addFiles = (files: File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    files.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      const hasAllowedType = file.type.startsWith('image/') || ALLOWED_FILE_EXTENSIONS.includes(extension)
      if (!hasAllowedType) {
        errors.push(`${file.name}: 지원하지 않는 형식이에요`)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 50MB 이하 파일만 첨부할 수 있어요`)
        return
      }
      validFiles.push(file)
    })

    if (validFiles.length > 0) {
      setAttachments((items) => [
        ...items,
        ...validFiles.map((file) => ({
          id: crypto.randomUUID(),
          type: 'file' as const,
          name: file.name,
          size: formatFileSize(file.size),
        })),
      ])
    }
    setAttachmentError(errors[0] ?? '')
  }

  const submit = () => {
    if (!canSubmit || !selectedAssignee) return
    setSubmitting(true)
    const input = {
      title: title.trim(),
      description: '',
      status,
      category,
      attachments,
      dueDate,
      assignee: selectedAssignee,
    }
    const savedTask = mode === 'edit' && task
      ? updateTask(projectId, task.id, input)
      : createTask({ ...input, projectId })

    if (savedTask) {
      onSaved?.(savedTask)
      onClose()
    } else {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[calc(100svh-7rem)] overflow-y-auto pr-1">
        <h2 className="text-h3 text-gray-900">
          {mode === 'create' ? '업무카드 등록' : '업무카드 수정'}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="task-title" className="mb-1.5 block text-body-sm font-medium text-gray-700">
              업무명 <span className="text-error">*</span>
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="수행할 업무를 입력하세요"
              maxLength={80}
            />
          </div>

          <label className="block text-body-sm font-medium text-gray-700">
            담당자 <span className="text-error">*</span>
            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className={cn(
                'mt-1.5 h-12 w-full rounded-md border border-gray-200 bg-white px-3.5 text-body focus:border-primary focus:outline-none',
                assigneeId ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              <option value="" disabled>팀원을 선택해주세요</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>{assignee.nickname}</option>
              ))}
              {task && !assignees.some((assignee) => assignee.id === task.assignee.id) && (
                <option value={task.assignee.id}>{task.assignee.nickname}</option>
              )}
            </select>
          </label>

          <fieldset>
            <legend className="text-body-sm font-medium text-gray-700">
              상태 <span className="text-error">*</span>
            </legend>
            <div className="mt-2 flex gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-body-sm font-medium text-gray-700">
              담당 영역 <span className="text-error">*</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as TaskCategory)}
                className="mt-1.5 h-12 w-full rounded-md border border-gray-200 bg-white px-3.5 text-body text-gray-900 focus:border-primary focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div>
              <label htmlFor="task-due-date" className="mb-1.5 block text-body-sm font-medium text-gray-700">
                마감일 <span className="text-error">*</span>
              </label>
              <Input
                id="task-due-date"
                type={isDateFocused || dueDate ? 'date' : 'text'}
                value={dueDate}
                onFocus={() => setIsDateFocused(true)}
                onBlur={() => {
                  if (!dueDate) setIsDateFocused(false)
                }}
                onChange={(event) => setDueDate(event.target.value)}
                placeholder="날짜 선택"
                className={dueDate ? 'text-gray-900' : 'text-gray-400'}
              />
            </div>
          </div>

          <div>
            <p className="text-body-sm font-medium text-gray-700">첨부 자료</p>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {attachments.map((attachment) => {
                  const AttachmentIcon = attachment.type === 'link' ? Link : FileText
                  return (
                    <div key={attachment.id} className="flex items-center gap-2 rounded-md bg-gray-50 p-3">
                      <AttachmentIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-body-sm text-gray-700">
                        {attachment.name}
                      </span>
                      {attachment.size && <span className="text-caption font-normal text-gray-400">{attachment.size}</span>}
                      <button
                        type="button"
                        aria-label={`${attachment.name} 첨부 삭제`}
                        onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              aria-expanded={isAttachmentMenuOpen}
              onClick={() => {
                setIsAttachmentMenuOpen((value) => !value)
                setIsLinkInputOpen(false)
                setLinkError('')
              }}
              className="mt-2 flex min-h-20 w-full flex-col items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-center hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
              <span className="text-caption font-normal text-gray-400">파일 또는 링크 첨부 (선택)</span>
              <span className="mt-1 text-caption font-normal text-gray-400">최소 50MB, PDF, PPTX, docx, zip, img</span>
            </button>

            {isAttachmentMenuOpen && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-white p-2 shadow-md">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false)
                    fileInputRef.current?.click()
                  }}
                  className="flex items-center justify-center gap-2 rounded-md px-3 py-3 text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  <Paperclip className="h-4 w-4 text-primary" aria-hidden />
                  파일 첨부
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachmentMenuOpen(false)
                    setIsLinkInputOpen(true)
                  }}
                  className="flex items-center justify-center gap-2 rounded-md px-3 py-3 text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  <Link className="h-4 w-4 text-primary" aria-hidden />
                  링크 첨부
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.docx,.zip,image/*"
              className="hidden"
              multiple
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />

            {isLinkInputOpen && (
              <div className="mt-2 flex items-start gap-2">
                <Input
                  value={linkValue}
                  onChange={(event) => setLinkValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addLink()
                    }
                  }}
                  placeholder="https:// 링크 주소"
                  errorText={linkError}
                  autoFocus
                />
                <Button
                  type="button"
                  size="md"
                  fullWidth={false}
                  onClick={addLink}
                  className="shrink-0 whitespace-nowrap text-white"
                >
                  추가
                </Button>
              </div>
            )}

            {attachmentError && (
              <p className="mt-2 text-caption font-normal text-error">{attachmentError}</p>
            )}

            <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-caption font-normal text-primary-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>파일 첨부만으로 기여도가 높아지지 않아요. 담당 업무와 연결된 산출물이 리포트에 반영됩니다.</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button type="button" variant="ghost" fullWidth={false} onClick={onClose} className="flex-1 bg-gray-100 text-gray-400">
            취소
          </Button>
          <Button type="button" fullWidth={false} disabled={!canSubmit} onClick={submit} className="flex-[2] text-white">
            {mode === 'create' ? '업무 등록' : '저장'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
