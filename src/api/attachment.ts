import { ApiError, BASE_URL, apiRequest } from './client'
import { validateExternalHttpsUrl } from '../lib/attachment'
import type {
  AttachmentDownloadResponse,
  OpenableAttachment,
  ServerAttachmentDownloadResponse,
} from '../types/attachment'

function getAuthenticatedApiPath(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new ApiError(
      'MISSING_DOWNLOAD_URL_API',
      '파일 다운로드 주소가 없습니다.'
    )
  }

  let url: URL
  try {
    url = new URL(trimmed, BASE_URL)
  } catch {
    throw new ApiError(
      'INVALID_DOWNLOAD_URL_API',
      '파일 다운로드 주소가 올바르지 않습니다.'
    )
  }

  if (url.origin !== new URL(BASE_URL).origin || !url.pathname.startsWith('/')) {
    throw new ApiError(
      'INVALID_DOWNLOAD_URL_API',
      '파일 다운로드 주소가 올바르지 않습니다.'
    )
  }

  return `${url.pathname}${url.search}`
}

function validateDownloadResponse(
  value: unknown
): AttachmentDownloadResponse {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      'INVALID_ATTACHMENT_DOWNLOAD_RESPONSE',
      '파일 다운로드 응답 형식이 올바르지 않습니다.'
    )
  }

  const response = value as ServerAttachmentDownloadResponse
  let downloadUrl: URL
  try {
    downloadUrl = new URL(response.downloadUrl ?? '')
  } catch {
    throw new ApiError(
      'INVALID_ATTACHMENT_DOWNLOAD_RESPONSE',
      '파일 다운로드 응답 형식이 올바르지 않습니다.'
    )
  }

  if (
    !Number.isSafeInteger(response.attachmentId) ||
    response.attachmentId === undefined ||
    response.attachmentId <= 0 ||
    typeof response.fileName !== 'string' ||
    !response.fileName.trim() ||
    (downloadUrl.protocol !== 'https:' && downloadUrl.protocol !== 'http:') ||
    !Number.isSafeInteger(response.expiresInSeconds) ||
    response.expiresInSeconds === undefined ||
    response.expiresInSeconds <= 0
  ) {
    throw new ApiError(
      'INVALID_ATTACHMENT_DOWNLOAD_RESPONSE',
      '파일 다운로드 응답 형식이 올바르지 않습니다.'
    )
  }

  return {
    attachmentId: response.attachmentId,
    fileName: response.fileName,
    downloadUrl: response.downloadUrl as string,
    expiresInSeconds: response.expiresInSeconds,
  }
}

export async function requestAttachmentDownloadUrl(downloadUrlApi: string) {
  const path = getAuthenticatedApiPath(downloadUrlApi)
  const response = await apiRequest<unknown>(path)
  return validateDownloadResponse(response)
}

function openWindowSafely(url: string) {
  const popup = window.open('about:blank', '_blank')
  if (!popup) {
    throw new ApiError(
      'POPUP_BLOCKED',
      '팝업이 차단되었습니다. 브라우저 설정을 확인해 주세요.'
    )
  }
  popup.opener = null
  popup.location.replace(url)
  return popup
}

export function openExternalLink(linkUrl: string) {
  const url = validateExternalHttpsUrl(linkUrl)
  openWindowSafely(url)
}

export async function downloadFileAttachment(downloadUrlApi?: string | null) {
  if (!downloadUrlApi?.trim()) {
    throw new ApiError(
      'MISSING_DOWNLOAD_URL_API',
      '파일 다운로드 주소가 없습니다.'
    )
  }

  const popup = window.open('about:blank', '_blank')
  if (!popup) {
    throw new ApiError(
      'POPUP_BLOCKED',
      '팝업이 차단되었습니다. 브라우저 설정을 확인해 주세요.'
    )
  }
  popup.opener = null

  try {
    const response = await requestAttachmentDownloadUrl(downloadUrlApi)
    popup.location.replace(response.downloadUrl)
    return response
  } catch (error) {
    popup.close()
    throw error
  }
}

export function openAttachment(attachment: OpenableAttachment) {
  if (attachment.attachmentType === 'LINK') {
    if (!attachment.linkUrl) {
      throw new ApiError('INVALID_LINK_URL', '첨부 링크 주소가 없습니다.')
    }
    openExternalLink(attachment.linkUrl)
    return
  }
  return downloadFileAttachment(attachment.downloadUrlApi)
}
