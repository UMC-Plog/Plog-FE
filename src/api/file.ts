import { ApiError, apiRequest } from './client'
import type {
  FileUploadActiveStage,
  FileUploadUsage,
  PresignedUploadRequest,
  PresignedUploadResponse,
  ServerPresignedUploadResponse,
  UploadedFile,
  UploadFileOptions,
  ValidatedUploadFile,
} from '../types/file'

const IMAGE_MAX_SIZE = 10 * 1024 * 1024
const FILE_MAX_SIZE = 50 * 1024 * 1024

const CONTENT_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
  fig: 'application/octet-stream',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
])

function toApiError(error: unknown) {
  if (error instanceof ApiError) return error
  return new ApiError(
    'FILE_UPLOAD_NETWORK_ERROR',
    '파일 업로드 중 네트워크 오류가 발생했습니다.'
  )
}

function getExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) return null
  return fileName.slice(lastDotIndex + 1).toLowerCase()
}

export function validateUploadFile(file: File): ValidatedUploadFile {
  if (!file.name.trim()) {
    throw new ApiError('INVALID_FILE_NAME', '파일 이름을 확인해 주세요.')
  }

  const extension = getExtension(file.name)
  if (!extension || !(extension in CONTENT_TYPE_BY_EXTENSION)) {
    throw new ApiError(
      'UNSUPPORTED_ATTACHMENT_TYPE',
      '지원하지 않는 파일 형식입니다.'
    )
  }

  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new ApiError(
      'INVALID_FILE_SIZE',
      '파일 크기 정보가 올바르지 않습니다.'
    )
  }

  const isImage = IMAGE_EXTENSIONS.has(extension)
  const maxSize = isImage ? IMAGE_MAX_SIZE : FILE_MAX_SIZE
  if (file.size > maxSize) {
    throw new ApiError(
      'FILE_SIZE_EXCEEDED',
      isImage
        ? '이미지는 최대 10MB까지 업로드할 수 있습니다.'
        : '파일은 최대 50MB까지 업로드할 수 있습니다.'
    )
  }

  const expectedContentType = CONTENT_TYPE_BY_EXTENSION[extension]
  const contentType =
    extension === 'fig' ? 'application/octet-stream' : file.type

  if (contentType !== expectedContentType) {
    throw new ApiError(
      'FILE_MIME_TYPE_MISMATCH',
      '파일 확장자와 MIME 타입이 일치하지 않습니다.'
    )
  }

  return {
    file,
    fileName: file.name,
    fileSize: file.size,
    contentType,
  }
}

function validateSignedHeaders(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '파일 업로드 URL 응답 형식이 올바르지 않습니다.'
    )
  }

  const headers: Record<string, string[]> = {}
  for (const [name, values] of Object.entries(value)) {
    if (
      !name.trim() ||
      !Array.isArray(values) ||
      values.length === 0 ||
      values.some((headerValue) => typeof headerValue !== 'string')
    ) {
      throw new ApiError(
        'INVALID_PRESIGNED_UPLOAD_RESPONSE',
        '파일 업로드 URL 응답 형식이 올바르지 않습니다.'
      )
    }
    headers[name] = [...values]
  }

  const headerNames = Object.keys(headers).map((name) => name.toLowerCase())
  if (headerNames.includes('authorization')) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      'S3 업로드 응답에 허용되지 않은 인증 헤더가 포함되어 있습니다.'
    )
  }
  if (!headerNames.includes('x-amz-tagging')) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '필수 S3 서명 헤더가 누락되었습니다.'
    )
  }

  return headers
}

function validatePresignedResponse(
  value: unknown
): PresignedUploadResponse {
  if (typeof value !== 'object' || value === null) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '파일 업로드 URL 응답 형식이 올바르지 않습니다.'
    )
  }

  const response = value as ServerPresignedUploadResponse
  let uploadUrl: URL
  try {
    uploadUrl = new URL(response.uploadUrl ?? '')
  } catch {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '파일 업로드 URL 응답 형식이 올바르지 않습니다.'
    )
  }

  const expiresAtValue = Date.parse(response.expiresAt ?? '')
  if (
    (uploadUrl.protocol !== 'https:' && uploadUrl.protocol !== 'http:') ||
    !Number.isSafeInteger(response.fileId) ||
    response.fileId === undefined ||
    response.fileId <= 0 ||
    typeof response.fileKey !== 'string' ||
    !response.fileKey ||
    typeof response.expiresAt !== 'string' ||
    !Number.isFinite(expiresAtValue)
  ) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '파일 업로드 URL 응답 형식이 올바르지 않습니다.'
    )
  }

  return {
    uploadUrl: response.uploadUrl as string,
    fileId: response.fileId,
    fileKey: response.fileKey,
    signedHeaders: validateSignedHeaders(response.signedHeaders),
    expiresAt: response.expiresAt,
  }
}

export async function requestPresignedUploadUrl(
  request: PresignedUploadRequest
) {
  const response = await apiRequest<unknown>(
    '/api/files/presigned-upload-url',
    {
      method: 'POST',
      body: request,
    }
  )
  return validatePresignedResponse(response)
}

export async function putFileToPresignedUrl(
  file: File,
  presigned: PresignedUploadResponse
) {
  const expiresAt = Date.parse(presigned.expiresAt)
  if (!Number.isFinite(expiresAt)) {
    throw new ApiError(
      'INVALID_PRESIGNED_UPLOAD_RESPONSE',
      '파일 업로드 URL 만료 시간이 올바르지 않습니다.'
    )
  }
  if (Date.now() >= expiresAt) {
    throw new ApiError(
      'PRESIGNED_URL_EXPIRED',
      '파일 업로드 URL이 만료되었습니다. 다시 업로드해 주세요.'
    )
  }

  const headers = new Headers()
  for (const [name, values] of Object.entries(presigned.signedHeaders)) {
    for (const value of values) headers.append(name, value)
  }

  let response: Response
  try {
    response = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
      credentials: 'omit',
    })
  } catch {
    throw new ApiError(
      'S3_UPLOAD_NETWORK_ERROR',
      'S3 파일 업로드 중 네트워크 오류가 발생했습니다.'
    )
  }

  if (!response.ok) {
    throw new ApiError(
      'S3_UPLOAD_FAILED',
      `S3 파일 업로드에 실패했습니다. (${response.status})`
    )
  }
}

export async function uploadFile(
  file: File,
  usage: FileUploadUsage,
  options: UploadFileOptions = {}
): Promise<UploadedFile> {
  let stage: FileUploadActiveStage = 'VALIDATING'
  options.onStateChange?.({ status: 'IN_PROGRESS', stage })

  try {
    const validated = validateUploadFile(file)

    stage = 'REQUESTING_PRESIGNED_URL'
    options.onStateChange?.({ status: 'IN_PROGRESS', stage })
    const presigned = await requestPresignedUploadUrl({
      fileName: validated.fileName,
      contentType: validated.contentType,
      fileSize: validated.fileSize,
      usage,
    })

    stage = 'UPLOADING_TO_S3'
    options.onStateChange?.({ status: 'IN_PROGRESS', stage })
    await putFileToPresignedUrl(validated.file, presigned)

    const uploadedFile: UploadedFile = {
      fileKey: presigned.fileKey,
      fileId: presigned.fileId,
      fileName: validated.fileName,
      fileSize: validated.fileSize,
      contentType: validated.contentType,
    }
    options.onStateChange?.({ status: 'SUCCESS', file: uploadedFile })
    return uploadedFile
  } catch (error: unknown) {
    const apiError = toApiError(error)
    options.onStateChange?.({ status: 'ERROR', stage, error: apiError })
    throw apiError
  }
}
