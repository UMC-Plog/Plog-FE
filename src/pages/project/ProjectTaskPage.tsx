import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { KanbanColumn } from '../../components/task/KanbanColumn'
import { ProgressBar } from '../../components/ProgressBar'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useTaskStore } from '../../store/taskStore'
import type { Task, TaskStatus } from '../../types/task'
import { isTaskDueSoon } from '../../utils/taskDate'

type TaskFilter = 'all' | 'mine' | 'dueSoon'

const TASK_STATUSES: TaskStatus[] = ['todo', 'inProgress', 'done']

const FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '내 업무' },
  { value: 'dueSoon', label: '마감임박' },
]

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function createPreviewTasks(projectId: string): Task[] {
  const now = new Date().toISOString()
  const assignees = {
    banana: { id: 'preview-banana', nickname: '바나나', avatarId: 'otter' },
    ggum: { id: 'preview-ggum', nickname: '곰곰', avatarId: 'ghost' },
  }

  return [
    { id: 'preview-1', projectId, title: '발표자료 초안', status: 'todo', category: 'document', attachmentCount: 1, dueDate: addDays(2), assignee: assignees.ggum, createdAt: now, updatedAt: now },
    { id: 'preview-2', projectId, title: 'UI 컴포넌트 설계', status: 'todo', category: 'design', attachmentCount: 1, dueDate: addDays(3), assignee: assignees.banana, createdAt: now, updatedAt: now },
    { id: 'preview-3', projectId, title: '요구사항 정리', status: 'inProgress', category: 'planning', attachmentCount: 2, dueDate: addDays(-1), assignee: assignees.banana, createdAt: now, updatedAt: now },
    { id: 'preview-4', projectId, title: '로그인 화면 개발', status: 'inProgress', category: 'development', attachmentCount: 2, dueDate: addDays(4), assignee: assignees.ggum, createdAt: now, updatedAt: now },
    { id: 'preview-5', projectId, title: 'DB 스키마 설계', status: 'inProgress', category: 'development', attachmentCount: 2, dueDate: addDays(1), assignee: assignees.banana, createdAt: now, updatedAt: now },
    { id: 'preview-6', projectId, title: '기획 문서 작성', status: 'done', category: 'planning', attachmentCount: 2, dueDate: addDays(-2), assignee: assignees.banana, createdAt: now, updatedAt: now },
    { id: 'preview-7', projectId, title: '테스트 케이스', status: 'done', category: 'test', attachmentCount: 2, dueDate: addDays(-3), assignee: assignees.banana, createdAt: now, updatedAt: now },
    { id: 'preview-8', projectId, title: 'API 명세 검토', status: 'todo', category: 'document', attachmentCount: 0, dueDate: addDays(7), assignee: assignees.ggum, createdAt: now, updatedAt: now },
  ]
}

export default function ProjectTaskPage() {
  const { id: projectId = '' } = useParams()
  const user = useAuthStore((state) => state.user)
  const storedTasks = useTaskStore((state) => state.tasks)
  const [filter, setFilter] = useState<TaskFilter>('all')

  const previewTasks = useMemo(() => createPreviewTasks(projectId), [projectId])
  const projectTasks = useMemo(() => {
    const tasks = storedTasks.filter((task) => task.projectId === projectId)
    return tasks.length > 0 ? tasks : previewTasks
  }, [previewTasks, projectId, storedTasks])

  const filteredTasks = useMemo(() => {
    if (filter === 'mine') {
      return user ? projectTasks.filter((task) => task.assignee.id === user.id) : []
    }
    if (filter === 'dueSoon') return projectTasks.filter((task) => isTaskDueSoon(task))
    return projectTasks
  }, [filter, projectTasks, user])

  const completedCount = projectTasks.filter((task) => task.status === 'done').length
  const totalCount = projectTasks.length

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
              onClick={() => setFilter(item.value)}
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

        <Button type="button" size="sm" fullWidth={false} icon={<Plus className="h-4 w-4" aria-hidden />} className="shrink-0 text-white">
          업무 등록
        </Button>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-4">
        <div className="flex min-w-max items-start gap-3">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={filteredTasks.filter((task) => task.status === status)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
