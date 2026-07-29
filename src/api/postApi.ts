import type {
  ServerPostCreateRequest,
  ServerPostCreateResponse,
  ServerPostDeleteResponse,
} from '../types/post'
import { apiRequest } from './client'

export function createPost(projectId: number, payload: ServerPostCreateRequest) {
  return apiRequest<ServerPostCreateResponse>(
    `/api/projects/${projectId}/posts`,
    {
      method: 'POST',
      body: payload,
    }
  )
}

export function deletePost(projectId: number, postId: number) {
  return apiRequest<ServerPostDeleteResponse>(
    `/api/projects/${projectId}/posts/${postId}`,
    { method: 'DELETE' }
  )
}
