import type {
  ServerPostCreateRequest,
  ServerPostCreateResponse,
  ServerPostDeleteResponse,
  ServerPostLikeResponse,
  ServerPostNoticeRequest,
  ServerPostNoticeResponse,
  PostLikeResult,
  PostNoticeResult,
  ServerPostAttachmentResponse,
  ServerPostFeedResponse,
  ServerPostResponse,
  PostFeedAttachmentViewModel,
  PostFeedResult,
  PostListItemViewModel,
  PostDetailViewModel,
  PostCommentViewModel,
  ServerPostCommentCreateRequest,
  ServerPostCommentListResponse,
  ServerPostCommentResponse,
  ServerPostUpdateRequest,
  ServerPostUpdateResponse,
} from '../types/post'
import { ApiError, apiRequest } from './client'
import type { ProfilePreset } from '../lib/profilePreset'

const PROFILE_PRESETS = new Set([
  'OTTER',
  'PENGUIN',
  'FROG',
  'KOALA',
  'PANDA',
  'SMILEY',
  'GHOST',
  'TIGER',
])

function isProfilePresetOrNull(
  value: unknown
): value is ProfilePreset | null {
  return value === null ||
    (typeof value === 'string' && PROFILE_PRESETS.has(value))
}

export async function createPost(
  projectId: number,
  payload: ServerPostCreateRequest
) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts`,
    {
      method: 'POST',
      body: payload,
    }
  )
  validatePostCreateResponse(response, projectId)
  return response as ServerPostCreateResponse
}

export async function updatePost(
  projectId: number,
  postId: number,
  payload: ServerPostUpdateRequest
) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}`,
    { method: 'PATCH', body: payload }
  )
  validatePostUpdateResponse(response, projectId, postId)
  return response as ServerPostUpdateResponse
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

function validatePostNoticeResponse(
  value: unknown,
  expectedProjectId: number,
  expectedPostId: number
): PostNoticeResult {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      'INVALID_POST_NOTICE_RESPONSE',
      '공지 변경 응답 형식이 올바르지 않습니다.'
    )
  }

  const response = value as ServerPostNoticeResponse
  if (
    !Number.isSafeInteger(response.postId) ||
    response.postId !== expectedPostId ||
    !Number.isSafeInteger(response.projectId) ||
    response.projectId !== expectedProjectId ||
    typeof response.isNotice !== 'boolean' ||
    typeof response.updatedAt !== 'string'
  ) {
    throw new ApiError(
      'INVALID_POST_NOTICE_RESPONSE',
      '공지 변경 응답 형식이 올바르지 않습니다.'
    )
  }

  return {
    postId: response.postId,
    projectId: response.projectId,
    isNotice: response.isNotice,
    updatedAt: response.updatedAt,
  }
}

export async function changePostNotice(
  projectId: number,
  postId: number,
  isNotice: boolean
) {
  const payload: ServerPostNoticeRequest = { isNotice }
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}/notice`,
    {
      method: 'PATCH',
      body: payload,
    }
  )

  return validatePostNoticeResponse(response, projectId, postId)
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

function validatePostCreateResponse(value: unknown, projectId: number) {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      'INVALID_POST_CREATE_RESPONSE',
      '게시글 작성 응답 형식이 올바르지 않습니다.'
    )
  }
  const post = value as ServerPostCreateResponse
  if (
    !isPositiveSafeInteger(post.postId) ||
    post.projectId !== projectId ||
    !isPositiveSafeInteger(post.projectMemberId) ||
    (typeof post.authorNickname !== 'string' &&
      post.authorNickname !== null) ||
    !isProfilePresetOrNull(post.profilePreset) ||
    typeof post.title !== 'string' ||
    typeof post.content !== 'string' ||
    typeof post.isNotice !== 'boolean' ||
    !isNonNegativeSafeInteger(post.likeCount) ||
    !isNonNegativeSafeInteger(post.commentCount) ||
    typeof post.likedByMe !== 'boolean' ||
    !Array.isArray(post.attachments) ||
    typeof post.createdAt !== 'string'
  ) {
    throw new ApiError(
      'INVALID_POST_CREATE_RESPONSE',
      '게시글 작성 응답 형식이 올바르지 않습니다.'
    )
  }
  post.attachments.forEach((attachment) =>
    validateAttachment(attachment, () => {
      throw new ApiError(
        'INVALID_POST_CREATE_RESPONSE',
        '게시글 작성 응답 형식이 올바르지 않습니다.'
      )
    })
  )
}

function validatePostUpdateResponse(
  value: unknown,
  projectId: number,
  postId: number
) {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      'INVALID_POST_UPDATE_RESPONSE',
      '게시글 수정 응답 형식이 올바르지 않습니다.'
    )
  }
  const post = value as ServerPostUpdateResponse
  if (
    post.postId !== postId ||
    post.projectId !== projectId ||
    !isPositiveSafeInteger(post.projectMemberId) ||
    (typeof post.authorNickname !== 'string' &&
      post.authorNickname !== null) ||
    !isProfilePresetOrNull(post.profilePreset) ||
    typeof post.title !== 'string' ||
    typeof post.content !== 'string' ||
    typeof post.isNotice !== 'boolean' ||
    !isNonNegativeSafeInteger(post.likeCount) ||
    !isNonNegativeSafeInteger(post.commentCount) ||
    typeof post.likedByMe !== 'boolean' ||
    !Array.isArray(post.attachments) ||
    typeof post.updatedAt !== 'string'
  ) {
    throw new ApiError(
      'INVALID_POST_UPDATE_RESPONSE',
      '게시글 수정 응답 형식이 올바르지 않습니다.'
    )
  }
  post.attachments.forEach((attachment) =>
    validateAttachment(attachment, () => {
      throw new ApiError(
        'INVALID_POST_UPDATE_RESPONSE',
        '게시글 수정 응답 형식이 올바르지 않습니다.'
      )
    })
  )
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
    attachment.postAttachmentId !== undefined &&
    !isPositiveSafeInteger(attachment.postAttachmentId)
  ) {
    invalidResponse()
  }
  if (
    attachment.fileSize !== undefined &&
    !isNonNegativeSafeInteger(attachment.fileSize)
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
    id: attachment.postAttachmentId,
    type: attachment.attachmentType,
    fileId: attachment.fileId,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
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
    !isProfilePresetOrNull(post.profilePreset) ||
    typeof post.title !== 'string' ||
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
    profilePreset: post.profilePreset,
    title: post.title,
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

function invalidCommentResponse(): never {
  throw new ApiError(
    'INVALID_POST_COMMENT_RESPONSE',
    '댓글 응답 형식이 올바르지 않습니다.'
  )
}

function validateComment(
  value: unknown,
  projectId: number,
  postId: number
): PostCommentViewModel {
  if (typeof value !== 'object' || value === null) invalidCommentResponse()
  const comment = value as ServerPostCommentResponse
  if (
    !isPositiveSafeInteger(comment.commentId) ||
    comment.postId !== postId ||
    comment.projectId !== projectId ||
    !isPositiveSafeInteger(comment.projectMemberId) ||
    (typeof comment.authorNickname !== 'string' &&
      comment.authorNickname !== null) ||
    !isProfilePresetOrNull(comment.profilePreset) ||
    typeof comment.content !== 'string' ||
    typeof comment.createdAt !== 'string'
  ) {
    invalidCommentResponse()
  }
  return {
    commentId: comment.commentId,
    postId: comment.postId,
    projectId: comment.projectId,
    projectMemberId: comment.projectMemberId,
    authorNickname: comment.authorNickname,
    profilePreset: comment.profilePreset,
    content: comment.content,
    createdAt: comment.createdAt,
  }
}

export async function fetchPostComments(projectId: number, postId: number) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}/comments`
  )
  if (typeof response !== 'object' || response === null) {
    invalidCommentResponse()
  }
  const list = response as ServerPostCommentListResponse
  if (list.postId !== postId || !Array.isArray(list.comments)) {
    invalidCommentResponse()
  }
  return list.comments.map((comment) =>
    validateComment(comment, projectId, postId)
  )
}

export async function createPostComment(
  projectId: number,
  postId: number,
  payload: ServerPostCommentCreateRequest
) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}/comments`,
    { method: 'POST', body: payload }
  )
  return validateComment(response, projectId, postId)
}

export async function deletePostComment(
  projectId: number,
  postId: number,
  commentId: number
) {
  const response = await apiRequest<unknown>(
    `/api/projects/${projectId}/posts/${postId}/comments/${commentId}`,
    { method: 'DELETE' }
  )
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof (response as ServerPostDeleteResponse).deleted !== 'boolean'
  ) {
    throw new ApiError(
      'INVALID_POST_COMMENT_DELETE_RESPONSE',
      '댓글 삭제 응답 형식이 올바르지 않습니다.'
    )
  }
  return response as ServerPostDeleteResponse
}
