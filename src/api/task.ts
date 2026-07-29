import { apiRequest } from './client'
import type {
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

export function updateTaskStatus(
  projectId: number,
  taskId: number,
  payload: ServerTaskStatusUpdateRequest
) {
  return apiRequest<ServerTaskStatusUpdateResponse>(
    `/api/projects/${projectId}/tasks/${taskId}/status`,
    {
      method: 'PATCH',
      body: payload,
    }
  )
}

export function deleteTask(projectId: number, taskId: number) {
  return apiRequest<ServerTaskDeleteResponse>(
    `/api/projects/${projectId}/tasks/${taskId}`,
    { method: 'DELETE' }
  )
}
