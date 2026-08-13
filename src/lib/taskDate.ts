import type { ServerTaskStatus } from '../types/task'

export function parseTaskDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export type TaskDueDateState = 'UPCOMING' | 'TODAY' | 'OVERDUE'

export interface TaskDueDateInfo {
  state: TaskDueDateState
  daysUntilDue: number
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function getTaskDueDateInfo(
  dueDate: string,
  now = new Date()
): TaskDueDateInfo {
  const dueDay = parseTaskDate(dueDate)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysUntilDue = Math.round(
    (dueDay.getTime() - today.getTime()) / DAY_IN_MS
  )

  if (daysUntilDue < 0) return { state: 'OVERDUE', daysUntilDue }
  if (daysUntilDue === 0) return { state: 'TODAY', daysUntilDue }
  return { state: 'UPCOMING', daysUntilDue }
}

export function getTaskDueDateState(
  dueDate: string,
  now = new Date()
): TaskDueDateState {
  return getTaskDueDateInfo(dueDate, now).state
}

export function resolveTaskOverdue(
  dueDate: string,
  serverIsOverdue: boolean,
  status: ServerTaskStatus,
  completedAt?: string | null,
  now = new Date()
) {
  if (status === 'DONE') {
    if (!completedAt) return serverIsOverdue

    const completedDate = new Date(completedAt)
    if (Number.isNaN(completedDate.getTime())) return serverIsOverdue

    return getTaskDueDateState(dueDate, completedDate) === 'OVERDUE'
  }

  if (serverIsOverdue) return true

  return getTaskDueDateState(dueDate, now) === 'OVERDUE'
}
