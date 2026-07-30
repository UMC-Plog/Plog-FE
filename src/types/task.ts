import type { NewAttachmentRequest } from './attachment'

export interface TaskAttachment {
  id: string
  type: 'file' | 'link'
  name: string
  url?: string
  size?: string
}

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

export type ServerTaskAttachmentRequest = NewAttachmentRequest

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
    fileId?: number
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

export type ServerTaskAttachmentAddRequest = NewAttachmentRequest

export type ServerTaskAttachmentAddResponse = ServerAttachmentResponse

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
