import { cn } from '../../lib/utils'
import type { Task, TaskStatus } from '../../types/task'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

const statusConfig: Record<TaskStatus, { label: string; dotClassName: string }> = {
  todo: { label: '예정', dotClassName: 'bg-gray-400' },
  inProgress: { label: '진행 중', dotClassName: 'bg-primary' },
  done: { label: '완료', dotClassName: 'bg-success' },
}

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  const config = statusConfig[status]

  return (
    <section className="w-52 shrink-0 rounded-xl bg-gray-50 p-3" aria-label={`${config.label} 업무`}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', config.dotClassName)} aria-hidden />
        <h2 className="text-caption text-gray-600">{config.label}</h2>
        <span className="text-caption font-normal text-gray-400">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </section>
  )
}
