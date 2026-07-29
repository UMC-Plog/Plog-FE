import type {
  ServerPostCreateRequest,
  ServerPostCreateResponse,
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
