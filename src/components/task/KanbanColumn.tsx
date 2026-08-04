import { cn } from '../../lib/utils'
import type { ServerTaskStatus, TaskListItemViewModel } from '../../types/task'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  status: ServerTaskStatus
  tasks: TaskListItemViewModel[]
  onTaskClick?: (task: TaskListItemViewModel) => void
}

const statusConfig: Record<ServerTaskStatus, { label: string; dotClassName: string }> = {
  TODO: { label: '예정', dotClassName: 'bg-gray-400' },
  IN_PROGRESS: { label: '진행 중', dotClassName: 'bg-primary' },
  DONE: { label: '완료', dotClassName: 'bg-success' },
}

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  const config = statusConfig[status]

  return (
    <section className="w-[240px] shrink-0 rounded-16 bg-gray-100 p-4" aria-label={`${config.label} 업무`}>
      <div className="mb-3 flex items-center gap-[7px]">
        <span className={cn('h-2 w-2 rounded-full', config.dotClassName)} aria-hidden />
        <h2 className="text-[12px] font-normal leading-4 text-gray-600">{config.label}</h2>
        <span className="text-[12px] font-normal leading-4 text-gray-400">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </section>
  )
}
