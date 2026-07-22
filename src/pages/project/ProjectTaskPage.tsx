import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { KanbanColumn } from '../../components/task/KanbanColumn'
import { TaskCardDetailModal } from '../../components/task/TaskCardDetailModal'
import { TaskCardFormModal } from '../../components/task/TaskCardFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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

export default function ProjectTaskPage() {
  const { id: projectId = '' } = useParams()
  const user = useAuthStore((state) => state.user)
  const storedTasks = useTaskStore((state) => state.tasks)
  const completeTask = useTaskStore((state) => state.completeTask)
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const projectTasks = useMemo(
    () => storedTasks.filter((task) => task.projectId === projectId),
    [projectId, storedTasks]
  )
  const selectedTask = projectTasks.find((task) => task.id === selectedTaskId) ?? null

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

        <Button
          type="button"
          size="sm"
          fullWidth={false}
          icon={<Plus className="h-4 w-4" aria-hidden />}
          className="shrink-0 text-white"
          onClick={() => {
            setFormMode('create')
            setEditingTask(null)
            setIsFormOpen(true)
          }}
        >
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
              onTaskClick={(task) => {
                setSelectedTaskId(task.id)
                setIsDetailOpen(true)
              }}
            />
          ))}
        </div>
      </div>

      <TaskCardFormModal
        open={isFormOpen}
        mode={formMode}
        task={editingTask}
        projectId={projectId}
        onClose={() => setIsFormOpen(false)}
        onSaved={(task) => {
          if (formMode === 'edit') {
            setSelectedTaskId(task.id)
            setIsDetailOpen(true)
          }
        }}
      />

      <TaskCardDetailModal
        open={isDetailOpen}
        task={selectedTask}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(task) => {
          setEditingTask(task)
          setFormMode('edit')
          setIsDetailOpen(false)
          setIsFormOpen(true)
        }}
        onDelete={() => setIsDeleteOpen(true)}
        onComplete={(task) => {
          completeTask(projectId, task.id)
          setIsDetailOpen(false)
        }}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        title="업무카드를 삭제하시겠어요?"
        highlight={selectedTask ? (
          <div className="w-full rounded-md bg-gray-100 px-4 py-3 text-center text-body-sm font-semibold text-gray-700">
            “{selectedTask.title}”
          </div>
        ) : undefined}
        description="삭제된 업무카드는 복구할 수 없어요"
        confirmText="삭제하기"
        cancelText="취소"
        destructive
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (selectedTask) deleteTask(projectId, selectedTask.id)
          setIsDeleteOpen(false)
          setIsDetailOpen(false)
          setSelectedTaskId(null)
        }}
      />
    </div>
  )
}
