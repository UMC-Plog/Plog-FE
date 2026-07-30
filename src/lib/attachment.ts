import { ApiError } from '../api/client'
import {
  MAX_ATTACHMENTS,
  type AttachmentRequest,
  type AttachmentDraft,
  type AttachmentDraftSummary,
  type NewAttachmentRequest,
} from '../types/attachment'

export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024

export const MAX_ATTACHMENT_SIZE_ERROR = '파일은 최대 50MB까지 첨부할 수 있어요'

export const isAttachmentSizeValid = (file: File) =>
  file.size <= MAX_ATTACHMENT_SIZE

export function formatFileSize(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return '-'
  }
  if (value < 1024) return `${Math.floor(value)} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const formatted = size >= 10 ? Math.round(size).toString() : size.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}

export function createFileFingerprint(file: File) {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }

  const [first, second] = parts
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const isIpv6 = normalized.includes(':')
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    (isIpv6 &&
      (normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:'))) ||
    isPrivateIpv4(normalized)
  )
}

export function validateExternalHttpsUrl(value: string) {
  const trimmed = value.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new ApiError('INVALID_LINK_URL', '올바른 URL을 입력해 주세요.')
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    isPrivateHostname(url.hostname)
  ) {
    throw new ApiError(
      'INVALID_LINK_URL',
      '공개된 HTTPS 주소만 첨부할 수 있습니다.'
    )
  }

  return url.toString()
}

export function getAttachmentDraftSummary(
  drafts: AttachmentDraft[],
  maxAttachments = MAX_ATTACHMENTS
): AttachmentDraftSummary {
  return {
    count: drafts.length,
    hasPendingUploads: drafts.some(
      (draft) =>
        draft.source === 'NEW' &&
        draft.attachmentType === 'FILE' &&
        (draft.status === 'WAITING' || draft.status === 'UPLOADING')
    ),
    hasUploadErrors: drafts.some(
      (draft) =>
        draft.source === 'NEW' &&
        draft.attachmentType === 'FILE' &&
        draft.status === 'ERROR'
    ),
    isAtLimit: drafts.length >= maxAttachments,
  }
}

export function toNewAttachmentRequests(
  drafts: AttachmentDraft[]
): NewAttachmentRequest[] {
  const requests: NewAttachmentRequest[] = []
  for (const draft of drafts) {
    if (draft.source !== 'NEW') continue
    if (draft.attachmentType === 'LINK') {
      requests.push({
        attachmentType: 'LINK' as const,
        fileName: draft.fileName,
        linkUrl: draft.linkUrl,
      })
      continue
    }
    if (draft.status !== 'SUCCESS' || !draft.fileKey) continue
    requests.push({
      attachmentType: 'FILE' as const,
      fileName: draft.fileName,
      fileSize: draft.fileSize,
      fileKey: draft.fileKey,
    })
  }
  return requests
}

export function toAttachmentRequests(
  drafts: AttachmentDraft[]
): AttachmentRequest[] {
  return drafts.map((draft) => {
    if (draft.attachmentType === 'LINK') {
      return {
        attachmentType: 'LINK',
        fileName: draft.fileName,
        linkUrl: draft.linkUrl,
      }
    }

    if (draft.source === 'SERVER') {
      if (
        !Number.isSafeInteger(draft.fileId) ||
        draft.fileId === undefined ||
        draft.fileId <= 0 ||
        !Number.isSafeInteger(draft.fileSize) ||
        draft.fileSize === undefined ||
        draft.fileSize < 0
      ) {
        throw new ApiError(
          'INVALID_EXISTING_ATTACHMENT',
          '기존 첨부파일 정보를 확인할 수 없습니다.'
        )
      }
      return {
        attachmentType: 'FILE',
        fileName: draft.fileName,
        fileSize: draft.fileSize,
        fileId: draft.fileId,
      }
    }

    if (draft.status !== 'SUCCESS' || !draft.fileKey) {
      throw new ApiError(
        'ATTACHMENT_UPLOAD_INCOMPLETE',
        '파일 업로드가 완료될 때까지 기다려 주세요.'
      )
    }
    return {
      attachmentType: 'FILE',
      fileName: draft.fileName,
      fileSize: draft.fileSize,
      fileKey: draft.fileKey,
    }
  })
}
