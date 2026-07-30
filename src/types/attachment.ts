import type { ApiError } from '../api/client'

export const MAX_ATTACHMENTS = 10

export type AttachmentDraft =
  | NewFileAttachmentDraft
  | LinkAttachmentDraft
  | ExistingFileAttachmentDraft
  | ExistingLinkAttachmentDraft

interface AttachmentDraftBase {
  localId: string
  fileName: string
}

export interface NewFileAttachmentDraft extends AttachmentDraftBase {
  source: 'NEW'
  attachmentType: 'FILE'
  file: File
  fileSize: number
  contentType: string
  fingerprint: string
  status: 'WAITING' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  fileKey?: string
  fileId?: number
  error?: ApiError
}

export interface LinkAttachmentDraft extends AttachmentDraftBase {
  source: 'NEW'
  attachmentType: 'LINK'
  linkUrl: string
}

export interface ExistingFileAttachmentDraft extends AttachmentDraftBase {
  source: 'SERVER'
  attachmentType: 'FILE'
  attachmentId: number
  fileId?: number
  fileSize?: number
  downloadUrlApi?: string | null
}

export interface ExistingLinkAttachmentDraft extends AttachmentDraftBase {
  source: 'SERVER'
  attachmentType: 'LINK'
  attachmentId: number
  linkUrl: string
}

export interface NewFileAttachmentRequest {
  attachmentType: 'FILE'
  fileName: string
  fileSize: number
  fileKey: string
}

export interface LinkAttachmentRequest {
  attachmentType: 'LINK'
  fileName: string
  linkUrl: string
}

export type NewAttachmentRequest =
  | NewFileAttachmentRequest
  | LinkAttachmentRequest

export interface AttachmentDraftSummary {
  count: number
  hasPendingUploads: boolean
  hasUploadErrors: boolean
  isAtLimit: boolean
}

export interface ServerAttachmentDownloadResponse {
  attachmentId?: number
  fileName?: string
  downloadUrl?: string
  expiresInSeconds?: number
}

export interface AttachmentDownloadResponse {
  attachmentId: number
  fileName: string
  downloadUrl: string
  expiresInSeconds: number
}

export type OpenableAttachment =
  | {
      attachmentType: 'FILE'
      downloadUrlApi?: string | null
    }
  | {
      attachmentType: 'LINK'
      linkUrl?: string | null
    }
