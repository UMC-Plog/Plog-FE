import { ApiError, apiRequest } from './client'
import type {
  ProjectActiveMember,
  ServerProfilePreset,
  ServerProjectActiveMemberResponse,
  ServerTaskCreateRequest,
  ServerTaskCreateResponse,
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

function isProfilePreset(value: unknown): value is ServerProfilePreset {
  return typeof value === 'string' && PROFILE_PRESETS.has(value)
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

export function updateTask(
  projectId: number,
  taskId: number,
  payload: ServerTaskUpdateRequest
) {
  return apiRequest<ServerTaskUpdateResponse>(
    `/api/projects/${projectId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: payload,
    }
  )
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

export function deleteTask(projectId: number, taskId: number) {
  return apiRequest<ServerTaskDeleteResponse>(
    `/api/projects/${projectId}/tasks/${taskId}`,
    { method: 'DELETE' }
  )
}
