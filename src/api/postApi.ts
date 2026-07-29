import type {
  ServerPostCreateRequest,
  ServerPostCreateResponse,
  ServerPostDeleteResponse,
  ServerPostLikeResponse,
  PostLikeResult,
  ServerPostAttachmentResponse,
  ServerPostFeedResponse,
  ServerPostResponse,
  PostFeedAttachmentViewModel,
  PostFeedResult,
  PostListItemViewModel,
  PostDetailViewModel,
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

function invalidFeedResponse(): never {
  throw new ApiError(
    'INVALID_POST_FEED_RESPONSE',
    '게시글 목록 응답 형식이 올바르지 않습니다.'
  )
}

function invalidDetailResponse(): never {
  throw new ApiError(
    'INVALID_POST_DETAIL_RESPONSE',
    '게시글 상세 응답 형식이 올바르지 않습니다.'
  )
}

type InvalidResponse = () => never

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function validateAttachment(
  value: unknown,
  invalidResponse: InvalidResponse
): PostFeedAttachmentViewModel {
  if (typeof value !== 'object' || value === null) invalidResponse()

  const attachment = value as ServerPostAttachmentResponse
  if (
    (attachment.attachmentType !== 'FILE' &&
      attachment.attachmentType !== 'LINK') ||
    typeof attachment.fileName !== 'string'
  ) {
    invalidResponse()
  }

  if (
    attachment.taskAttachmentId !== undefined &&
    !isPositiveSafeInteger(attachment.taskAttachmentId)
  ) {
    invalidResponse()
  }
  if (
    attachment.fileId !== undefined &&
    !isPositiveSafeInteger(attachment.fileId)
  ) {
    invalidResponse()
  }
  if (
    attachment.linkUrl !== undefined &&
    attachment.linkUrl !== null &&
    typeof attachment.linkUrl !== 'string'
  ) {
    invalidResponse()
  }
  if (
    attachment.downloadUrlApi !== undefined &&
    attachment.downloadUrlApi !== null &&
    typeof attachment.downloadUrlApi !== 'string'
  ) {
    invalidResponse()
  }

  return {
    id: attachment.taskAttachmentId,
    type: attachment.attachmentType,
    fileId: attachment.fileId,
    fileName: attachment.fileName,
    linkUrl: attachment.linkUrl,
    downloadUrlApi: attachment.downloadUrlApi,
  }
}

function validatePostResponse(
  value: unknown,
  expectedProjectId: number,
  invalidResponse: InvalidResponse,
  expectedPostId?: number
): PostListItemViewModel {
  if (typeof value !== 'object' || value === null) invalidResponse()

  const post = value as ServerPostResponse
  if (
    !isPositiveSafeInteger(post.postId) ||
    (expectedPostId !== undefined && post.postId !== expectedPostId) ||
    !isPositiveSafeInteger(post.projectId) ||
    post.projectId !== expectedProjectId ||
    !isPositiveSafeInteger(post.projectMemberId) ||
    (typeof post.authorNickname !== 'string' && post.authorNickname !== null) ||
    typeof post.content !== 'string' ||
    typeof post.isNotice !== 'boolean' ||
    !isNonNegativeSafeInteger(post.likeCount) ||
    !isNonNegativeSafeInteger(post.commentCount) ||
    typeof post.likedByMe !== 'boolean' ||
    !Array.isArray(post.attachments) ||
    typeof post.createdAt !== 'string' ||
    typeof post.updatedAt !== 'string'
  ) {
    invalidResponse()
  }

  return {
    postId: post.postId,
    projectId: post.projectId,
    projectMemberId: post.projectMemberId,
    authorNickname: post.authorNickname,
    content: post.content,
    isNotice: post.isNotice,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe: post.likedByMe,
    attachments: post.attachments.map((attachment) =>
      validateAttachment(attachment, invalidResponse)
    ),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

function validateFeedResponse(
  value: unknown,
  expectedProjectId: number
): PostFeedResult {
  if (typeof value !== 'object' || value === null) invalidFeedResponse()

  const feed = value as ServerPostFeedResponse
  if (
    !Object.prototype.hasOwnProperty.call(feed, 'notice') ||
    (feed.notice !== null && typeof feed.notice !== 'object') ||
    !Array.isArray(feed.posts) ||
    typeof feed.hasNext !== 'boolean'
  ) {
    invalidFeedResponse()
  }

  if (
    feed.hasNext &&
    (typeof feed.nextCursor !== 'string' ||
      feed.nextCursor.trim().length === 0)
  ) {
    invalidFeedResponse()
  }
  if (
    !feed.hasNext &&
    feed.nextCursor !== null &&
    feed.nextCursor !== undefined
  ) {
    invalidFeedResponse()
  }

  return {
    notice:
      feed.notice === null || feed.notice === undefined
        ? null
        : validatePostResponse(
            feed.notice,
            expectedProjectId,
            invalidFeedResponse
          ),
    posts: feed.posts.map((post) =>
      validatePostResponse(post, expectedProjectId, invalidFeedResponse)
    ),
    nextCursor: feed.hasNext ? (feed.nextCursor as string) : null,
    hasNext: feed.hasNext,
  }
}

export interface FetchPostFeedParams {
  cursor?: string
  size?: number
}

export async function fetchPostFeed(
  projectId: number,
  params: FetchPostFeedParams = {}
) {
  const searchParams = new URLSearchParams()
  if (params.cursor !== undefined) searchParams.set('cursor', params.cursor)
  if (params.size !== undefined) searchParams.set('size', String(params.size))
  const query = searchParams.toString()
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts${query ? `?${query}` : ''}`
  )

  return validateFeedResponse(response, projectId)
}

export async function fetchPostDetail(
  projectId: number,
  postId: number
): Promise<PostDetailViewModel> {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}`
  )

  return validatePostResponse(
    response,
    projectId,
    invalidDetailResponse,
    postId
  )
}
