import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { fetchProjectTasks } from '../../api/task'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { AlertModal } from '../../components/Modal'
import { KanbanColumn } from '../../components/task/KanbanColumn'
import { ProgressBar } from '../../components/ProgressBar'
import { cn } from '../../lib/utils'
import type {
  ServerTaskSummaryResponse,
  ServerTaskStatus,
  TaskListItemViewModel,
} from '../../types/task'

type TaskFilter = 'all' | 'mine' | 'dueSoon'

const TASK_STATUSES: ServerTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '내 업무' },
  { value: 'dueSoon', label: '마감임박' },
]

function parseProjectId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null
  const projectId = Number(value)
  return Number.isSafeInteger(projectId) ? projectId : null
}

function mapTaskSummary(response: ServerTaskSummaryResponse): TaskListItemViewModel {
  const { taskId, title, category, cardStatus, endDate, isOverdue, assignee, attachmentCount } =
    response

  if (
    typeof taskId !== 'number' ||
    typeof title !== 'string' ||
    !category ||
    !cardStatus ||
    typeof endDate !== 'string' ||
    typeof isOverdue !== 'boolean' ||
    typeof assignee?.projectMemberId !== 'number' ||
    typeof assignee.nickname !== 'string' ||
    typeof attachmentCount !== 'number'
  ) {
    throw new Error('업무 목록 응답 형식이 올바르지 않습니다.')
  }

  return {
    id: taskId,
    title,
    category,
    status: cardStatus,
    dueDate: endDate,
    isOverdue,
    assignee: {
      projectMemberId: assignee.projectMemberId,
      nickname: assignee.nickname,
      profilePreset: assignee.profilePreset,
    },
    attachmentCount,
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
}

export default function ProjectTaskPage() {
  const { id: projectIdParam = '' } = useParams<{ id: string }>()
  const projectId = useMemo(() => parseProjectId(projectIdParam), [projectIdParam])
  const requestIdRef = useRef(0)
  const [tasks, setTasks] = useState<TaskListItemViewModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [notice, setNotice] = useState<'create' | 'detail' | 'filter' | null>(null)

  const loadTasks = useCallback(async () => {
    const requestId = ++requestIdRef.current

    if (projectId === null) {
      setTasks([])
      setError('올바른 프로젝트 ID가 아니어서 업무 목록을 불러올 수 없습니다.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchProjectTasks(projectId)
      if (!Array.isArray(response.content)) {
        throw new Error('업무 목록 응답 형식이 올바르지 않습니다.')
      }
      const nextTasks = response.content.map(mapTaskSummary)
      if (requestId === requestIdRef.current) setTasks(nextTasks)
    } catch (loadError: unknown) {
      if (requestId === requestIdRef.current) {
        setTasks([])
        setError(getErrorMessage(loadError))
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadTasks()
    return () => {
      requestIdRef.current += 1
    }
  }, [loadTasks])

  const completedCount = tasks.filter((task) => task.status === 'DONE').length
  const totalCount = tasks.length

  return (
    <div className="min-w-0 px-4 py-4">
      <section className="rounded-lg bg-white p-4 shadow-md" aria-label="전체 업무 완료율">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-body-sm font-semibold text-gray-900">전체 완료율</h1>
          <span className="text-body-sm font-semibold text-primary">
            {completedCount} / {totalCount} 완료
          </span>
        </div>
        {totalCount > 0 ? (
          <ProgressBar total={totalCount} current={completedCount} />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-gray-100" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} />
        )}
      </section>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2" role="group" aria-label="업무 필터">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (item.value === 'all') {
                  setFilter('all')
                  return
                }
                setNotice('filter')
              }}
              aria-pressed={filter === item.value}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-caption transition-colors',
                filter === item.value
                  ? 'border-primary-100 bg-primary-100 text-primary'
                  : 'border-gray-200 bg-white font-normal text-gray-400'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          fullWidth={false}
          icon={<Plus className="h-4 w-4" aria-hidden />}
          className="shrink-0 text-white"
          onClick={() => setNotice('create')}
        >
          업무 등록
        </Button>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-body-sm text-gray-400">업무를 불러오는 중이에요.</p>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-body-sm text-error">{error}</p>
          <Button
            type="button"
            size="sm"
            fullWidth={false}
            className="mt-4 text-white"
            onClick={() => void loadTasks()}
          >
            다시 시도
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" aria-hidden />}
          title="아직 등록된 업무가 없어요"
          description="업무가 등록되면 상태별로 확인할 수 있어요"
        />
      ) : (
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-4">
          <div className="flex min-w-max items-start gap-3">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks.filter((task) => task.status === status)}
                onTaskClick={() => setNotice('detail')}
              />
            ))}
          </div>
        </div>
      )}

      <AlertModal
        open={notice !== null}
        title={
          notice === 'filter'
            ? '필터 연동 준비 중이에요'
            : notice === 'detail'
              ? '업무 상세 연동 준비 중이에요'
              : '업무 등록 연동 준비 중이에요'
        }
        description={
          notice === 'filter'
            ? '이번 단계에서는 전체 업무만 확인할 수 있어요.'
            : '서버 API 연동 후 사용할 수 있어요.'
        }
        onConfirm={() => setNotice(null)}
      />
    </div>
  )
}
