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

// Server DTOs from the Task API. The existing UI model above remains unchanged
// until the project routes provide real numeric project IDs.
export type ServerTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type ServerTaskCategory =
  | 'PLANNING'
  | 'DESIGN'
  | 'DEVELOP'
  | 'TEST_FIX'
  | 'PRESENTATION_DOC'
  | 'RESEARCH'
  | 'MATERIAL_PRODUCTION'
  | 'PRESENTATION'
  | 'SCHEDULE_MANAGEMENT'
  | 'ETC'

export type ServerProfilePreset =
  | 'OTTER'
  | 'PENGUIN'
  | 'FROG'
  | 'KOALA'
  | 'PANDA'
  | 'SMILEY'
  | 'GHOST'
  | 'TIGER'

export interface ServerProjectActiveMemberResponse {
  projectMemberId?: number
  nickname?: string
  profilePreset?: ServerProfilePreset | null
}

export interface ProjectActiveMember {
  projectMemberId: number
  nickname: string
  profilePreset: ServerProfilePreset | null
}

export type ServerTaskAttachmentType = 'FILE' | 'LINK'

export interface ServerTaskAttachmentRequest {
  attachmentType: ServerTaskAttachmentType
  fileName: string
  fileSize?: number
  linkUrl?: string
  fileKey?: string
}

export interface ServerAttachmentResponse {
  taskAttachmentId?: number
  attachmentType?: ServerTaskAttachmentType
  fileId?: number
  fileName?: string
  linkUrl?: string | null
  downloadUrlApi?: string | null
}

export interface ServerAssigneeResponse {
  projectMemberId?: number
  nickname?: string | null
  profilePreset?: ServerProfilePreset | null
}

export interface ServerTaskSummaryResponse {
  taskId?: number
  title?: string
  category?: ServerTaskCategory
  cardStatus?: ServerTaskStatus
  endDate?: string
  isOverdue?: boolean
  assignee?: ServerAssigneeResponse
  attachmentCount?: number
}

export interface ServerTaskListResponse {
  content?: ServerTaskSummaryResponse[]
}

export interface TaskListItemViewModel {
  id: number
  title: string
  category: ServerTaskCategory
  status: ServerTaskStatus
  dueDate: string
  isOverdue: boolean
  assignee: {
    projectMemberId: number
    nickname: string | null
    profilePreset?: ServerProfilePreset | null
  }
  attachmentCount: number
}

export interface TaskDetailViewModel {
  id: number
  title: string
  assignee: {
    projectMemberId: number
    nickname: string | null
    profilePreset?: ServerProfilePreset | null
  }
  category: ServerTaskCategory
  status: ServerTaskStatus
  dueDate: string
  completedAt?: string | null
  dDay: number
  isOverdue: boolean
  isImminent: boolean
  attachments: Array<{
    id: number
    type: ServerTaskAttachmentType
    fileName: string
    linkUrl?: string | null
    downloadUrlApi?: string | null
  }>
}

export interface ServerTaskDetailResponse {
  taskId?: number
  title?: string
  assignee?: ServerAssigneeResponse
  category?: ServerTaskCategory
  cardStatus?: ServerTaskStatus
  endDate?: string
  completedAt?: string | null
  dDay?: number
  isOverdue?: boolean
  isImminent?: boolean
  attachments?: ServerAttachmentResponse[]
}

export interface ServerTaskCreateRequest {
  title: string
  projectMemberId: number
  category: ServerTaskCategory
  cardStatus: ServerTaskStatus
  endDate: string
  attachments?: ServerTaskAttachmentRequest[]
}

export interface ServerTaskCreateResponse {
  taskId?: number
  title?: string
  category?: ServerTaskCategory
  cardStatus?: ServerTaskStatus
  endDate?: string
  projectMemberId?: number
  attachments?: ServerAttachmentResponse[]
}

export interface ServerTaskUpdateRequest {
  title?: string
  projectMemberId?: number
  category?: ServerTaskCategory
  endDate?: string
}

export interface ServerTaskUpdateResponse {
  taskId?: number
  title?: string
  category?: ServerTaskCategory
  cardStatus?: ServerTaskStatus
  endDate?: string
  projectMemberId?: number
  attachments?: ServerAttachmentResponse[]
}

export interface ServerTaskStatusUpdateRequest {
  cardStatus: ServerTaskStatus
}

export interface ServerTaskStatusUpdateResponse {
  taskId?: number
  cardStatus?: ServerTaskStatus
  completedAt?: string | null
}

export interface ServerTaskDeleteResponse {
  isDeleted?: boolean
}
