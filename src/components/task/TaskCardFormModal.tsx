import { UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  createTask,
  fetchActiveProjectMembers,
} from '../../api/task'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { Button } from '../Button'
import { Input } from '../Input'
import { BottomSheet } from '../Modal'
import { cn } from '../../lib/utils'
import type { ProjectType } from '../../types/project'
import type {
  ProjectActiveMember,
  ServerProfilePreset,
  ServerTaskCategory,
  ServerTaskStatus,
} from '../../types/task'

interface TaskCardFormModalProps {
  open: boolean
  projectId: number
  projectType?: ProjectType
  onClose: () => void
  onCreated: () => void
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

export function TaskCardFormModal({
  open,
  projectId,
  projectType,
  onClose,
  onCreated,
}: TaskCardFormModalProps) {
  const requestIdRef = useRef(0)
  const submittingRef = useRef(false)
  const [members, setMembers] = useState<ProjectActiveMember[]>([])
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string>()
  const [title, setTitle] = useState('')
  const [projectMemberId, setProjectMemberId] = useState<number | null>(null)
  const [status, setStatus] = useState<ServerTaskStatus>('TODO')
  const [category, setCategory] = useState<ServerTaskCategory | ''>('')
  const [endDate, setEndDate] = useState('')
  const [isDateFocused, setIsDateFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()

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
    setProjectMemberId(null)
    setIsMembersLoading(true)
    setMembersError(undefined)

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

    setTitle('')
    setStatus('TODO')
    setCategory('')
    setEndDate('')
    setIsDateFocused(false)
    setIsSubmitting(false)
    setSubmitError(undefined)
    submittingRef.current = false
    void loadMembers()

    return () => {
      requestIdRef.current += 1
    }
  }, [loadMembers, open])

  useEffect(() => {
    if (category && !categories.some((option) => option.value === category)) {
      setCategory('')
    }
  }, [categories, category])

  const normalizedTitle = title.trim()
  const selectedMember = members.find(
    (member) => member.projectMemberId === projectMemberId
  )
  const canSubmit = Boolean(
    normalizedTitle.length >= 2 &&
      selectedMember &&
      category &&
      status &&
      endDate &&
      projectType &&
      !isMembersLoading &&
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

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(undefined)

    try {
      await createTask(projectId, {
        title: normalizedTitle,
        projectMemberId: selectedMember.projectMemberId,
        category,
        cardStatus: status,
        endDate,
      })
      onCreated()
      onClose()
    } catch (error: unknown) {
      setSubmitError(getErrorMessage(error))
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="max-h-[calc(100svh-7rem)] overflow-y-auto pr-1">
        <h2 className="text-h3 text-gray-900">업무카드 등록</h2>

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

          <fieldset>
            <legend className="text-body-sm font-medium text-gray-700">
              담당자 <span className="text-error">*</span>
            </legend>
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
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
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
                      aria-pressed={selected}
                      onClick={() =>
                        setProjectMemberId(member.projectMemberId)
                      }
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-left',
                        selected
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-200 bg-white'
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
                      <span className="min-w-0 truncate text-body-sm text-gray-700">
                        {member.nickname}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
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
                disabled={categories.length === 0}
                onChange={(event) =>
                  setCategory(event.target.value as ServerTaskCategory)
                }
                className="mt-1.5 h-12 w-full rounded-md border border-gray-200 bg-white px-3.5 text-body text-gray-900 focus:border-primary focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="" disabled>
                  영역 선택
                </option>
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <span className="mt-1.5 block text-caption font-normal text-error">
                  프로젝트 유형을 확인할 수 없어요.
                </span>
              )}
            </label>

            <div>
              <label
                htmlFor="task-due-date"
                className="mb-1.5 block text-body-sm font-medium text-gray-700"
              >
                마감일 <span className="text-error">*</span>
              </label>
              <Input
                id="task-due-date"
                type={isDateFocused || endDate ? 'date' : 'text'}
                value={endDate}
                onFocus={() => setIsDateFocused(true)}
                onBlur={() => {
                  if (!endDate) setIsDateFocused(false)
                }}
                onChange={(event) => setEndDate(event.target.value)}
                placeholder="날짜 선택"
                className={endDate ? 'text-gray-900' : 'text-gray-400'}
              />
            </div>
          </div>

          <div>
            <p className="text-body-sm font-medium text-gray-700">첨부 자료</p>
            <div className="mt-2 flex min-h-20 w-full items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-4 text-center">
              <span className="text-caption font-normal text-gray-400">
                첨부 기능은 준비 중이에요.
              </span>
            </div>
          </div>
        </div>

        {submitError && (
          <p className="mt-3 text-caption font-normal text-error">
            {submitError}
          </p>
        )}

        <div className="mt-5 flex gap-3">
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
            {isSubmitting ? '등록 중' : '업무 등록'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
