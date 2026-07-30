import { ApiError, apiRequest } from './client'
import type {
  ProjectActiveMember,
  ServerProfilePreset,
  ServerProjectActiveMemberResponse,
  ServerTaskCreateRequest,
  ServerTaskCreateResponse,
  ServerAttachmentResponse,
  ServerTaskDeleteResponse,
  ServerTaskDetailResponse,
  ServerTaskListResponse,
  ServerTaskStatusUpdateRequest,
  ServerTaskStatusUpdateResponse,
  ServerTaskUpdateRequest,
  ServerTaskUpdateResponse,
} from '../types/task'

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

function isValidAttachment(value: unknown): value is ServerAttachmentResponse {
  if (typeof value !== 'object' || value === null) return false

  const attachment = value as ServerAttachmentResponse
  return (
    Number.isSafeInteger(attachment.taskAttachmentId) &&
    attachment.taskAttachmentId !== undefined &&
    attachment.taskAttachmentId > 0 &&
    (attachment.attachmentType === 'FILE' ||
      attachment.attachmentType === 'LINK') &&
    (attachment.fileId === undefined ||
      (Number.isSafeInteger(attachment.fileId) && attachment.fileId > 0)) &&
    typeof attachment.fileName === 'string' &&
    (attachment.linkUrl === undefined ||
      attachment.linkUrl === null ||
      typeof attachment.linkUrl === 'string') &&
    (attachment.downloadUrlApi === undefined ||
      attachment.downloadUrlApi === null ||
      typeof attachment.downloadUrlApi === 'string')
  )
}

export async function fetchActiveProjectMembers(
  projectId: number
): Promise<ProjectActiveMember[]> {
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new ApiError(
      'INVALID_PROJECT_ID',
      '올바른 프로젝트 ID가 아닙니다.'
    )
  }

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

export function fetchProjectTasks(projectId: number) {
  return apiRequest<ServerTaskListResponse>(`/api/projects/${projectId}/tasks`)
}

export function fetchTaskDetail(projectId: number, taskId: number) {
  return apiRequest<ServerTaskDetailResponse>(
    `/api/projects/${projectId}/tasks/${taskId}`
  )
}

export function fetchOverdueTasks(projectId: number) {
  return apiRequest<ServerTaskListResponse>(
    `/api/projects/${projectId}/tasks/overdue`
  )
}

export function fetchTasksByMember(projectId: number, projectMemberId: number) {
  return apiRequest<ServerTaskListResponse>(
    `/api/projects/${projectId}/members/${projectMemberId}/tasks`
  )
}

export function createTask(projectId: number, payload: ServerTaskCreateRequest) {
  return apiRequest<ServerTaskCreateResponse>(`/api/projects/${projectId}/tasks`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateTask(
  projectId: number,
  taskId: number,
  payload: ServerTaskUpdateRequest
) {
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
    typeof task.category !== 'string' ||
    !TASK_CATEGORIES.has(task.category) ||
    typeof task.cardStatus !== 'string' ||
    !TASK_STATUSES.has(task.cardStatus) ||
    typeof task.endDate !== 'string' ||
    !Number.isSafeInteger(task.projectMemberId) ||
    task.projectMemberId === undefined ||
    task.projectMemberId <= 0 ||
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

export async function updateTaskStatus(
  projectId: number,
  taskId: number,
  payload: ServerTaskStatusUpdateRequest
) {
  const response = await apiRequest<ServerTaskStatusUpdateResponse>(
    `/api/projects/${projectId}/tasks/${taskId}/status`,
    {
      method: 'PATCH',
      body: payload,
    }
  )

  if (
    !Number.isSafeInteger(response.taskId) ||
    response.taskId !== taskId ||
    response.cardStatus !== payload.cardStatus ||
    (response.completedAt !== undefined &&
      response.completedAt !== null &&
      typeof response.completedAt !== 'string')
  ) {
    throw new ApiError(
      'INVALID_TASK_STATUS_RESPONSE',
      '업무 상태 변경 응답 형식이 올바르지 않습니다.'
    )
  }

  return response
}

export async function deleteTask(projectId: number, taskId: number) {
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
