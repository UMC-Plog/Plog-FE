export function parseTaskDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function resolveTaskOverdue(
  dueDate: string,
  serverIsOverdue: boolean,
  now = new Date()
) {
  if (serverIsOverdue) return true

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return parseTaskDate(dueDate) < today
}
