import { ApiError, apiRequest } from './client'
import type {
  ProjectActiveMember,
  ServerProfilePreset,
  ServerProjectActiveMemberResponse,
  ServerTaskCreateRequest,
  ServerTaskCreateResponse,
  ServerTaskAttachmentAddRequest,
  ServerTaskAttachmentAddResponse,
  ServerAttachmentResponse,
  ServerTaskDeleteResponse,
  ServerTaskDetailResponse,
  ServerTaskListResponse,
  ServerTaskSummaryResponse,
  ServerTaskCategory,
  ServerTaskStatus,
  ServerTaskStatusUpdateRequest,
  ServerTaskStatusUpdateResponse,
  ServerTaskUpdateRequest,
  ServerTaskUpdateResponse,
  TaskDetailViewModel,
  TaskListItemViewModel,
} from '../types/task'
import { resolveTaskOverdue } from '../utils/taskDate'

const PROFILE_PRESETS: ReadonlySet<string> = new Set([
  'OTTER',
  'PENGUIN',
  'FROG',
  'KOALA',
  'PANDA',
  'SMILEY',
  'GHOST',
  'TIGER',
])

const TASK_CATEGORIES: ReadonlySet<string> = new Set([
  'PLANNING',
  'DESIGN',
  'DEVELOP',
  'TEST_FIX',
  'PRESENTATION_DOC',
  'RESEARCH',
  'MATERIAL_PRODUCTION',
  'PRESENTATION',
  'SCHEDULE_MANAGEMENT',
  'ETC',
])

const TASK_STATUSES: ReadonlySet<string> = new Set([
  'TODO',
  'IN_PROGRESS',
  'DONE',
])

function isProfilePreset(value: unknown): value is ServerProfilePreset {
  return typeof value === 'string' && PROFILE_PRESETS.has(value)
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isTaskCategory(value: unknown): value is ServerTaskCategory {
  return typeof value === 'string' && TASK_CATEGORIES.has(value)
}

function isTaskStatus(value: unknown): value is ServerTaskStatus {
  return typeof value === 'string' && TASK_STATUSES.has(value)
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function assertProjectId(projectId: number) {
  if (!isPositiveSafeInteger(projectId)) {
    throw new ApiError('INVALID_PROJECT_ID', '올바른 프로젝트 ID가 아닙니다.')
  }
}

function assertTaskId(taskId: number) {
  if (!isPositiveSafeInteger(taskId)) {
    throw new ApiError('INVALID_TASK_ID', '올바른 업무 ID가 아닙니다.')
  }
}

function isValidAttachment(value: unknown): value is ServerAttachmentResponse {
  if (typeof value !== 'object' || value === null) return false

  const attachment = value as ServerAttachmentResponse
  const hasCommonFields =
    Number.isSafeInteger(attachment.taskAttachmentId) &&
    attachment.taskAttachmentId !== undefined &&
    attachment.taskAttachmentId > 0 &&
    (attachment.attachmentType === 'FILE' ||
      attachment.attachmentType === 'LINK') &&
    typeof attachment.fileName === 'string'

  if (!hasCommonFields) return false
  return attachment.attachmentType === 'FILE'
    ? isPositiveSafeInteger(attachment.fileId) &&
        typeof attachment.downloadUrlApi === 'string' &&
        (attachment.linkUrl === undefined || attachment.linkUrl === null)
    : typeof attachment.linkUrl === 'string' &&
        (attachment.downloadUrlApi === undefined ||
          attachment.downloadUrlApi === null)
}

function mapTaskSummary(value: unknown): TaskListItemViewModel {
  const message = '업무 목록 응답 형식이 올바르지 않습니다.'
  if (typeof value !== 'object' || value === null) {
    throw new ApiError('INVALID_TASK_LIST_RESPONSE', message)
  }

  const task = value as ServerTaskSummaryResponse
  const assignee = task.assignee
  if (
    !isPositiveSafeInteger(task.taskId) ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    !isTaskCategory(task.category) ||
    !isTaskStatus(task.cardStatus) ||
    !isValidDate(task.endDate) ||
    typeof task.isOverdue !== 'boolean' ||
    typeof assignee !== 'object' ||
    assignee === null ||
    !isPositiveSafeInteger(assignee.projectMemberId) ||
    (typeof assignee.nickname !== 'string' && assignee.nickname !== null) ||
    (assignee.profilePreset !== undefined &&
      assignee.profilePreset !== null &&
      !isProfilePreset(assignee.profilePreset)) ||
    !isNonNegativeSafeInteger(task.attachmentCount)
  ) {
    throw new ApiError('INVALID_TASK_LIST_RESPONSE', message)
  }

  return {
    id: task.taskId,
    title: task.title,
    category: task.category,
    status: task.cardStatus,
    dueDate: task.endDate,
    isOverdue: resolveTaskOverdue(task.endDate, task.isOverdue),
    assignee: {
      projectMemberId: assignee.projectMemberId,
      nickname: assignee.nickname,
      profilePreset: assignee.profilePreset,
    },
    attachmentCount: task.attachmentCount,
  }
}

function mapTaskList(value: unknown): TaskListItemViewModel[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !Array.isArray((value as ServerTaskListResponse).content)
  ) {
    throw new ApiError(
      'INVALID_TASK_LIST_RESPONSE',
      '업무 목록 응답 형식이 올바르지 않습니다.'
    )
  }
  return (value as ServerTaskListResponse).content!.map(mapTaskSummary)
}

function mapTaskDetail(
  value: unknown,
  requestedTaskId: number
): TaskDetailViewModel {
  const message = '업무 상세 응답 형식이 올바르지 않습니다.'
  if (typeof value !== 'object' || value === null) {
    throw new ApiError('INVALID_TASK_DETAIL_RESPONSE', message)
  }

  const task = value as ServerTaskDetailResponse
  const assignee = task.assignee
  if (
    task.taskId !== requestedTaskId ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    typeof assignee !== 'object' ||
    assignee === null ||
    !isPositiveSafeInteger(assignee.projectMemberId) ||
    (typeof assignee.nickname !== 'string' && assignee.nickname !== null) ||
    (assignee.profilePreset !== undefined &&
      assignee.profilePreset !== null &&
      !isProfilePreset(assignee.profilePreset)) ||
    !isTaskCategory(task.category) ||
    !isTaskStatus(task.cardStatus) ||
    !isValidDate(task.endDate) ||
    (task.completedAt !== undefined &&
      task.completedAt !== null &&
      typeof task.completedAt !== 'string') ||
    !Number.isSafeInteger(task.dDay) ||
    typeof task.isOverdue !== 'boolean' ||
    typeof task.isImminent !== 'boolean' ||
    !Array.isArray(task.attachments) ||
    !task.attachments.every(isValidAttachment)
  ) {
    throw new ApiError('INVALID_TASK_DETAIL_RESPONSE', message)
  }

  return {
    id: task.taskId,
    title: task.title,
    assignee: {
      projectMemberId: assignee.projectMemberId,
      nickname: assignee.nickname,
      profilePreset: assignee.profilePreset,
    },
    category: task.category,
    status: task.cardStatus,
    dueDate: task.endDate,
    completedAt: task.completedAt,
    dDay: task.dDay!,
    isOverdue: resolveTaskOverdue(task.endDate, task.isOverdue),
    isImminent: task.isImminent,
    attachments: task.attachments.map((attachment) => ({
      id: attachment.taskAttachmentId!,
      type: attachment.attachmentType!,
      fileId: attachment.fileId,
      fileName: attachment.fileName!,
      linkUrl: attachment.linkUrl,
      downloadUrlApi: attachment.downloadUrlApi,
    })),
  }
}

export async function fetchActiveProjectMembers(
  projectId: number
): Promise<ProjectActiveMember[]> {
  assertProjectId(projectId)

  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/members`
  )

  if (!Array.isArray(response)) {
    throw new ApiError(
      'INVALID_PROJECT_MEMBER_RESPONSE',
      '프로젝트 멤버 응답 형식이 올바르지 않습니다.'
    )
  }

  return response.map((value) => {
    if (typeof value !== 'object' || value === null) {
      throw new ApiError(
        'INVALID_PROJECT_MEMBER_RESPONSE',
        '프로젝트 멤버 응답 형식이 올바르지 않습니다.'
      )
    }

    const member = value as ServerProjectActiveMemberResponse
    if (
      !Number.isSafeInteger(member.projectMemberId) ||
      member.projectMemberId === undefined ||
      member.projectMemberId <= 0 ||
      typeof member.nickname !== 'string' ||
      (member.profilePreset !== null &&
        !isProfilePreset(member.profilePreset))
    ) {
      throw new ApiError(
        'INVALID_PROJECT_MEMBER_RESPONSE',
        '프로젝트 멤버 응답 형식이 올바르지 않습니다.'
      )
    }

    return {
      projectMemberId: member.projectMemberId,
      nickname: member.nickname,
      profilePreset: member.profilePreset,
    }
  })
}

export async function fetchProjectTasks(projectId: number) {
  assertProjectId(projectId)
  return mapTaskList(
    await apiRequest<unknown>(`/api/projects/${projectId}/tasks`)
  )
}

export async function fetchTaskDetail(projectId: number, taskId: number) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  return mapTaskDetail(
    await apiRequest<unknown>(`/api/projects/${projectId}/tasks/${taskId}`),
    taskId
  )
}

export async function fetchOverdueTasks(projectId: number) {
  assertProjectId(projectId)
  return mapTaskList(
    await apiRequest<unknown>(`/api/projects/${projectId}/tasks/overdue`)
  )
}

export async function fetchTasksByMember(
  projectId: number,
  projectMemberId: number
) {
  assertProjectId(projectId)
  if (!isPositiveSafeInteger(projectMemberId)) {
    throw new ApiError(
      'INVALID_PROJECT_MEMBER_ID',
      '올바른 프로젝트 멤버 ID가 아닙니다.'
    )
  }
  return mapTaskList(
    await apiRequest<unknown>(
      `/api/projects/${projectId}/members/${projectMemberId}/tasks`
    )
  )
}

export async function createTask(
  projectId: number,
  payload: ServerTaskCreateRequest
) {
  assertProjectId(projectId)
  const response = await apiRequest<unknown>(`/api/projects/${projectId}/tasks`, {
    method: 'POST',
    body: payload,
  })

  if (typeof response !== 'object' || response === null) {
    throw new ApiError(
      'INVALID_TASK_CREATE_RESPONSE',
      '업무 생성 응답 형식이 올바르지 않습니다.'
    )
  }
  const task = response as ServerTaskCreateResponse
  if (
    !isPositiveSafeInteger(task.taskId) ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    !isTaskCategory(task.category) ||
    !isTaskStatus(task.cardStatus) ||
    !isValidDate(task.endDate) ||
    !isPositiveSafeInteger(task.projectMemberId) ||
    !Array.isArray(task.attachments) ||
    !task.attachments.every(isValidAttachment)
  ) {
    throw new ApiError(
      'INVALID_TASK_CREATE_RESPONSE',
      '업무 생성 응답 형식이 올바르지 않습니다.'
    )
  }
  return task
}

export async function updateTask(
  projectId: number,
  taskId: number,
  payload: ServerTaskUpdateRequest
) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: payload,
    }
  )

  if (typeof response !== 'object' || response === null) {
    throw new ApiError(
      'INVALID_TASK_UPDATE_RESPONSE',
      '업무 수정 응답 형식이 올바르지 않습니다.'
    )
  }

  const task = response as ServerTaskUpdateResponse
  if (
    task.taskId !== taskId ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    !isTaskCategory(task.category) ||
    !isTaskStatus(task.cardStatus) ||
    !isValidDate(task.endDate) ||
    !isPositiveSafeInteger(task.projectMemberId) ||
    !Array.isArray(task.attachments) ||
    !task.attachments.every(isValidAttachment)
  ) {
    throw new ApiError(
      'INVALID_TASK_UPDATE_RESPONSE',
      '업무 수정 응답 형식이 올바르지 않습니다.'
    )
  }

  return task
}

export async function addTaskAttachment(
  projectId: number,
  taskId: number,
  payload: ServerTaskAttachmentAddRequest
) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/tasks/${taskId}/attachments`,
    {
      method: 'POST',
      body: payload,
    }
  )

  if (!isValidAttachment(response)) {
    throw new ApiError(
      'INVALID_TASK_ATTACHMENT_ADD_RESPONSE',
      '업무 첨부 추가 응답 형식이 올바르지 않습니다.'
    )
  }
  return response as ServerTaskAttachmentAddResponse
}

export async function deleteTaskAttachment(
  projectId: number,
  taskId: number,
  taskAttachmentId: number
) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  if (!isPositiveSafeInteger(taskAttachmentId)) {
    throw new ApiError(
      'INVALID_TASK_ATTACHMENT_ID',
      '올바른 업무 첨부 ID가 아닙니다.'
    )
  }
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/tasks/${taskId}/attachments/${taskAttachmentId}`,
    { method: 'DELETE' }
  )
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as ServerTaskDeleteResponse).isDeleted !== 'boolean'
  ) {
    throw new ApiError(
      'INVALID_TASK_ATTACHMENT_DELETE_RESPONSE',
      '업무 첨부 삭제 응답 형식이 올바르지 않습니다.'
    )
  }
  return response as ServerTaskDeleteResponse
}

export async function updateTaskStatus(
  projectId: number,
  taskId: number,
  payload: ServerTaskStatusUpdateRequest
) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/tasks/${taskId}/status`,
    {
      method: 'PATCH',
      body: payload,
    }
  )

  if (
    typeof response !== 'object' ||
    response === null
  ) {
    throw new ApiError(
      'INVALID_TASK_STATUS_RESPONSE',
      '업무 상태 변경 응답 형식이 올바르지 않습니다.'
    )
  }

  const statusResponse = response as ServerTaskStatusUpdateResponse
  if (
    statusResponse.taskId !== taskId ||
    !isTaskStatus(statusResponse.cardStatus) ||
    statusResponse.cardStatus !== payload.cardStatus ||
    (statusResponse.completedAt !== undefined &&
      statusResponse.completedAt !== null &&
      typeof statusResponse.completedAt !== 'string')
  ) {
    throw new ApiError(
      'INVALID_TASK_STATUS_RESPONSE',
      '업무 상태 변경 응답 형식이 올바르지 않습니다.'
    )
  }

  return statusResponse
}

export async function deleteTask(projectId: number, taskId: number) {
  assertProjectId(projectId)
  assertTaskId(taskId)
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/tasks/${taskId}`,
    { method: 'DELETE' }
  )

  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as ServerTaskDeleteResponse).isDeleted !== 'boolean'
  ) {
    throw new ApiError(
      'INVALID_TASK_DELETE_RESPONSE',
      '업무 삭제 응답 형식이 올바르지 않습니다.'
    )
  }

  return response as ServerTaskDeleteResponse
}
