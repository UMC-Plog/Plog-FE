import type { Task } from '../types/task'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function parseTaskDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getLocalToday() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export function isTaskOverdue(task: Task) {
  return task.status !== 'done' && parseTaskDate(task.dueDate) < getLocalToday()
}

export function isTaskDueSoon(task: Task, days = 3) {
  if (task.status === 'done') return false

  const today = getLocalToday()
  const dueDate = parseTaskDate(task.dueDate)
  const difference = dueDate.getTime() - today.getTime()
  return difference >= 0 && difference <= days * DAY_IN_MS
}

export function getTaskDaysRemaining(task: Task) {
  const today = getLocalToday()
  const dueDate = parseTaskDate(task.dueDate)
  return Math.round((dueDate.getTime() - today.getTime()) / DAY_IN_MS)
}
