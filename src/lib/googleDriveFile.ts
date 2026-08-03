import type { PersonalGoogleDrivePickerFile } from './googlePicker'

const GOOGLE_DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'
const GOOGLE_WORKSPACE_MIME_PREFIX = 'application/vnd.google-apps.'
const GOOGLE_DOCS_MIME_TYPE = 'application/vnd.google-apps.document'
const GOOGLE_SLIDES_MIME_TYPE = 'application/vnd.google-apps.presentation'
const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export type GoogleDriveFileErrorCode =
  | 'GOOGLE_DRIVE_AUTH_REQUIRED'
  | 'GOOGLE_DRIVE_ACCESS_DENIED'
  | 'GOOGLE_DRIVE_FILE_NOT_FOUND'
  | 'GOOGLE_DRIVE_RATE_LIMITED'
  | 'GOOGLE_DRIVE_NETWORK_ERROR'
  | 'GOOGLE_DRIVE_UNSUPPORTED_WORKSPACE_FILE'
  | 'GOOGLE_DRIVE_EMPTY_FILE'
  | 'GOOGLE_DRIVE_DOWNLOAD_FAILED'
  | 'GOOGLE_DRIVE_EXPORT_FAILED'

export class GoogleDriveFileError extends Error {
  readonly code: GoogleDriveFileErrorCode
  readonly status?: number

  constructor(
    code: GoogleDriveFileErrorCode,
    message: string,
    status?: number
  ) {
    super(message)
    this.name = 'GoogleDriveFileError'
    this.code = code
    this.status = status
  }
}

interface GoogleDriveFileRequest {
  url: string
  fileName: string
  contentType?: string
  operation: 'download' | 'export'
}

function appendExtension(fileName: string, extension: '.docx' | '.pptx') {
  return fileName.toLowerCase().endsWith(extension)
    ? fileName
    : `${fileName}${extension}`
}

function createDriveFileRequest(
  file: PersonalGoogleDrivePickerFile
): GoogleDriveFileRequest {
  const encodedFileId = encodeURIComponent(file.id)

  if (file.mimeType === GOOGLE_DOCS_MIME_TYPE) {
    const params = new URLSearchParams({ mimeType: DOCX_MIME_TYPE })
    return {
      url: `${GOOGLE_DRIVE_FILES_API}/${encodedFileId}/export?${params}`,
      fileName: appendExtension(file.name, '.docx'),
      contentType: DOCX_MIME_TYPE,
      operation: 'export',
    }
  }

  if (file.mimeType === GOOGLE_SLIDES_MIME_TYPE) {
    const params = new URLSearchParams({ mimeType: PPTX_MIME_TYPE })
    return {
      url: `${GOOGLE_DRIVE_FILES_API}/${encodedFileId}/export?${params}`,
      fileName: appendExtension(file.name, '.pptx'),
      contentType: PPTX_MIME_TYPE,
      operation: 'export',
    }
  }

  if (file.mimeType.startsWith(GOOGLE_WORKSPACE_MIME_PREFIX)) {
    throw new GoogleDriveFileError(
      'GOOGLE_DRIVE_UNSUPPORTED_WORKSPACE_FILE',
      '지원하지 않는 Google Workspace 파일 형식입니다.'
    )
  }

  return {
    url: `${GOOGLE_DRIVE_FILES_API}/${encodedFileId}?alt=media`,
    fileName: file.name,
    operation: 'download',
  }
}

function createResponseError(
  status: number,
  operation: GoogleDriveFileRequest['operation']
) {
  if (status === 401) {
    return new GoogleDriveFileError(
      'GOOGLE_DRIVE_AUTH_REQUIRED',
      'Google 인증이 만료되었습니다. 다시 인증해 주세요.',
      status
    )
  }
  if (status === 403) {
    return new GoogleDriveFileError(
      'GOOGLE_DRIVE_ACCESS_DENIED',
      '파일에 접근할 권한이 없거나 Google Drive에서 다운로드가 제한된 파일입니다.',
      status
    )
  }
  if (status === 404) {
    return new GoogleDriveFileError(
      'GOOGLE_DRIVE_FILE_NOT_FOUND',
      'Google Drive에서 파일을 찾을 수 없습니다.',
      status
    )
  }
  if (status === 429) {
    return new GoogleDriveFileError(
      'GOOGLE_DRIVE_RATE_LIMITED',
      'Google Drive 요청이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.',
      status
    )
  }

  return operation === 'export'
    ? new GoogleDriveFileError(
        'GOOGLE_DRIVE_EXPORT_FAILED',
        'Google 문서를 첨부 가능한 파일로 변환하지 못했습니다.',
        status
      )
    : new GoogleDriveFileError(
        'GOOGLE_DRIVE_DOWNLOAD_FAILED',
        'Google Drive 파일을 다운로드하지 못했습니다.',
        status
      )
}

function getLastModified(modifiedTime?: string) {
  if (!modifiedTime) return undefined
  const timestamp = Date.parse(modifiedTime)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export async function downloadPersonalGoogleDriveFile(
  file: PersonalGoogleDrivePickerFile,
  accessToken: string
): Promise<File> {
  const request = createDriveFileRequest(file)
  let response: Response

  try {
    response = await fetch(request.url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'omit',
    })
  } catch {
    throw new GoogleDriveFileError(
      'GOOGLE_DRIVE_NETWORK_ERROR',
      'Google Drive 파일을 가져오는 중 네트워크 오류가 발생했습니다.'
    )
  }

  if (!response.ok) {
    throw createResponseError(response.status, request.operation)
  }

  let blob: Blob
  try {
    blob = await response.blob()
  } catch {
    throw new GoogleDriveFileError(
      'GOOGLE_DRIVE_NETWORK_ERROR',
      'Google Drive 파일 응답을 받는 중 네트워크 오류가 발생했습니다.'
    )
  }

  if (blob.size === 0) {
    throw new GoogleDriveFileError(
      'GOOGLE_DRIVE_EMPTY_FILE',
      'Google Drive에서 비어 있는 파일이 반환되었습니다.'
    )
  }

  const responseContentType = response.headers.get('Content-Type')?.trim()
  const contentType =
    request.contentType || responseContentType || file.mimeType
  const lastModified = getLastModified(file.modifiedTime)

  return new File([blob], request.fileName, {
    type: contentType,
    ...(lastModified === undefined ? {} : { lastModified }),
  })
}
