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

export interface TaskAttachment {
  id: string
  type: 'file' | 'link'
  name: string
  url?: string
  size?: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: TaskStatus
  category: TaskCategory
  attachments: TaskAttachment[]
  attachmentCount: number
  dueDate: string
  assignee: TaskAssignee
  createdAt: string
  updatedAt: string
}

export type CreateTaskInput = Pick<
  Task,
  'projectId' | 'title' | 'description' | 'status' | 'category' | 'attachments' | 'dueDate' | 'assignee'
>

export type UpdateTaskInput = Pick<
  Task,
  'title' | 'description' | 'status' | 'category' | 'attachments' | 'dueDate' | 'assignee'
>
