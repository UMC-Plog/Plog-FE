export type TaskStatus = 'todo' | 'inProgress' | 'done'

export type TaskCategory =
  | 'document'
  | 'design'
  | 'planning'
  | 'development'
  | 'test'

export interface TaskAssignee {
  id: string
  nickname: string
  avatarId?: string
  avatarImageUrl?: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: TaskStatus
  category: TaskCategory
  attachmentCount: number
  dueDate: string
  assignee: TaskAssignee
  createdAt: string
  updatedAt: string
}
