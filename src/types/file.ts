import type { ApiError } from '../api/client'

export type FileUploadUsage = 'POST' | 'TASK' | 'CHAT'

export interface PresignedUploadRequest {
  fileName: string
  contentType: string
  fileSize: number
  usage: FileUploadUsage
}

export interface ServerPresignedUploadResponse {
  uploadUrl?: string
  fileId?: number
  fileKey?: string
  signedHeaders?: Record<string, string[]>
  expiresAt?: string
}

export interface PresignedUploadResponse {
  uploadUrl: string
  fileId: number
  fileKey: string
  signedHeaders: Record<string, string[]>
  expiresAt: string
}

export interface ValidatedUploadFile {
  file: File
  fileName: string
  fileSize: number
  contentType: string
}

export interface UploadedFile {
  fileKey: string
  fileId: number
  fileName: string
  fileSize: number
  contentType: string
}

export type FileUploadActiveStage =
  | 'VALIDATING'
  | 'REQUESTING_PRESIGNED_URL'
  | 'UPLOADING_TO_S3'

export type FileUploadState =
  | { status: 'IDLE' }
  | { status: 'IN_PROGRESS'; stage: FileUploadActiveStage }
  | { status: 'SUCCESS'; file: UploadedFile }
  | { status: 'ERROR'; stage: FileUploadActiveStage; error: ApiError }

export interface UploadFileOptions {
  onStateChange?: (state: FileUploadState) => void
}
