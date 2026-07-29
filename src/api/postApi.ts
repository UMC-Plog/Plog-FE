import type {
  ServerPostCreateRequest,
  ServerPostCreateResponse,
  ServerPostDeleteResponse,
  ServerPostLikeResponse,
  PostLikeResult,
} from '../types/post'
import { ApiError, apiRequest } from './client'

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

function validatePostLikeResponse(
  response: unknown,
  expectedPostId: number
): PostLikeResult {
  if (
    typeof response !== 'object' ||
    response === null
  ) {
    throw new ApiError(
      'INVALID_POST_LIKE_RESPONSE',
      '좋아요 응답 형식이 올바르지 않습니다.'
    )
  }

  const { postId, liked, likeCount } = response as ServerPostLikeResponse

  if (
    !Number.isSafeInteger(postId) ||
    postId !== expectedPostId ||
    typeof liked !== 'boolean' ||
    !Number.isSafeInteger(likeCount) ||
    likeCount === undefined ||
    likeCount < 0
  ) {
    throw new ApiError(
      'INVALID_POST_LIKE_RESPONSE',
      '좋아요 응답 형식이 올바르지 않습니다.'
    )
  }

  return {
    postId,
    liked,
    likeCount,
  }
}

async function requestPostLike(
  projectId: number,
  postId: number,
  method: 'PUT' | 'DELETE'
) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}/like`,
    { method }
  )

  return validatePostLikeResponse(response, postId)
}

export function likePost(projectId: number, postId: number) {
  return requestPostLike(projectId, postId, 'PUT')
}

export function unlikePost(projectId: number, postId: number) {
  return requestPostLike(projectId, postId, 'DELETE')
}
