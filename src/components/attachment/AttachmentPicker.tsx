import {
  Camera,
  Cloud,
  FileText,
  FolderOpen,
  Image,
  Images,
  Link as LinkIcon,
  Paperclip,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent } from 'react'
import { ApiError } from '../../api/client'
import { uploadFile, validateUploadFileType } from '../../api/file'
import {
  createFileFingerprint,
  formatFileSize,
  validateExternalHttpsUrl,
} from '../../lib/attachment'
import {
  downloadPersonalGoogleDriveFile,
  GoogleDriveFileError,
} from '../../lib/googleDriveFile'
import {
  clearPersonalGoogleDriveAccessToken,
  getPersonalGoogleDriveAccessToken,
  openPersonalGoogleDrivePicker,
} from '../../lib/googlePicker'
import {
  MAX_ATTACHMENTS,
  type AttachmentDraft,
  type NewFileAttachmentDraft,
} from '../../types/attachment'
import type { FileUploadUsage } from '../../types/file'
import { Button } from '../Button'
import { Input } from '../Input'
import { BottomSheet, Modal } from '../Modal'

interface AttachmentPickerProps {
  value: AttachmentDraft[]
  onChange: (drafts: AttachmentDraft[]) => void
  usage: FileUploadUsage
  maxAttachments?: number
  disabled?: boolean
  variant?: 'default' | 'post' | 'task'
}

const FILE_ACCEPT = '.pdf,.pptx,.docx,.zip,.fig'
const IMAGE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif'

function isImageAttachment(draft: AttachmentDraft) {
  if (draft.attachmentType !== 'FILE') return false
  if (draft.source === 'NEW' && draft.contentType.startsWith('image/')) {
    return true
  }
  return /\.(?:jpe?g|png|webp|gif)$/i.test(draft.fileName)
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : '첨부 처리 중 오류가 발생했습니다.'
}

function getGoogleDriveErrorMessage(error: unknown) {
  if (!(error instanceof GoogleDriveFileError)) {
    return error instanceof Error
      ? error.message
      : 'Google Drive 파일을 첨부하지 못했습니다. 다시 시도해 주세요.'
  }

  switch (error.code) {
    case 'GOOGLE_DRIVE_AUTH_REQUIRED':
      return 'Google 인증이 만료되었습니다. Google Drive를 다시 선택해 주세요.'
    case 'GOOGLE_DRIVE_ACCESS_DENIED':
      return '파일에 접근할 권한이 없거나 다운로드가 제한된 파일입니다.'
    case 'GOOGLE_DRIVE_FILE_NOT_FOUND':
      return 'Google Drive에서 파일을 찾을 수 없습니다.'
    case 'GOOGLE_DRIVE_RATE_LIMITED':
      return 'Google Drive 요청이 제한되었습니다. 잠시 후 다시 시도해 주세요.'
    case 'GOOGLE_DRIVE_UNSUPPORTED_WORKSPACE_FILE':
      return '지원하지 않는 Google Drive 파일 형식입니다.'
    case 'GOOGLE_DRIVE_NETWORK_ERROR':
      return 'Google Drive 파일을 가져오는 중 네트워크 오류가 발생했습니다.'
    case 'GOOGLE_DRIVE_EMPTY_FILE':
      return 'Google Drive에서 비어 있는 파일이 반환되었습니다.'
    case 'GOOGLE_DRIVE_DOWNLOAD_FAILED':
      return 'Google Drive 파일을 다운로드하지 못했습니다.'
    case 'GOOGLE_DRIVE_EXPORT_FAILED':
      return 'Google 문서를 첨부 가능한 파일로 변환하지 못했습니다.'
  }
}

function createLocalId() {
  return crypto.randomUUID()
}

export function AttachmentPicker({
  value,
  onChange,
  usage,
  maxAttachments = MAX_ATTACHMENTS,
  disabled = false,
  variant = 'default',
}: AttachmentPickerProps) {
  const inputId = useId()
  const attachmentSheetTitleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const imageLibraryInputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const firstAttachmentOptionRef = useRef<HTMLButtonElement>(null)
  const draftsRef = useRef(value)
  const generationsRef = useRef(new Map<string, number>())
  const mountedRef = useRef(true)
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false)
  const [canUseCameraCapture, setCanUseCameraCapture] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const [attachmentError, setAttachmentError] = useState<string>()
  const [isGoogleDriveProcessing, setIsGoogleDriveProcessing] = useState(false)

  useEffect(() => {
    draftsRef.current = value
  }, [value])

  useEffect(() => {
    const generations = generationsRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generations.clear()
    }
  }, [])

  useEffect(() => {
    if (variant !== 'post') return

    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const updateCameraAvailability = () => {
      setCanUseCameraCapture(
        coarsePointer.matches && navigator.maxTouchPoints > 0
      )
    }

    updateCameraAvailability()
    coarsePointer.addEventListener('change', updateCameraAvailability)
    return () =>
      coarsePointer.removeEventListener('change', updateCameraAvailability)
  }, [variant])

  useEffect(() => {
    if (!isAttachmentSheetOpen) return

    const previousFocus = document.activeElement as HTMLElement | null
    const trigger = attachmentMenuTriggerRef.current
    const frame = window.requestAnimationFrame(() => {
      firstAttachmentOptionRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      const focusTarget = previousFocus ?? trigger
      focusTarget?.focus()
    }
  }, [isAttachmentSheetOpen])

  const commit = useCallback((next: AttachmentDraft[]) => {
    draftsRef.current = next
    onChange(next)
  }, [onChange])

  const updateDraft = useCallback((
    localId: string,
    update: (draft: AttachmentDraft) => AttachmentDraft
  ) => {
    if (!mountedRef.current) return
    const current = draftsRef.current
    if (!current.some((draft) => draft.localId === localId)) return
    commit(
      current.map((draft) =>
        draft.localId === localId ? update(draft) : draft
      )
    )
  }, [commit])

  const startUpload = useCallback(async (localId: string) => {
    const draft = draftsRef.current.find(
      (item): item is NewFileAttachmentDraft =>
        item.localId === localId &&
        item.source === 'NEW' &&
        item.attachmentType === 'FILE'
    )
    if (!draft || draft.status === 'UPLOADING') return

    const generation = (generationsRef.current.get(localId) ?? 0) + 1
    generationsRef.current.set(localId, generation)
    updateDraft(localId, (item) => ({
      ...(item as NewFileAttachmentDraft),
      status: 'UPLOADING',
      error: undefined,
    }))

    try {
      const uploaded = await uploadFile(draft.file, usage)
      if (
        !mountedRef.current ||
        generationsRef.current.get(localId) !== generation
      ) {
        return
      }
      updateDraft(localId, (item) => ({
        ...(item as NewFileAttachmentDraft),
        status: 'SUCCESS',
        fileKey: uploaded.fileKey,
        fileId: uploaded.fileId,
        contentType: uploaded.contentType,
        error: undefined,
      }))
    } catch (error: unknown) {
      if (
        !mountedRef.current ||
        generationsRef.current.get(localId) !== generation
      ) {
        return
      }
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError('FILE_UPLOAD_ERROR', getErrorMessage(error))
      updateDraft(localId, (item) => ({
        ...(item as NewFileAttachmentDraft),
        status: 'ERROR',
        error: apiError,
      }))
    }
  }, [updateDraft, usage])

  const selectFiles = (files: File[]) => {
    setAttachmentError(undefined)
    const existingFingerprints = new Set(
      draftsRef.current.flatMap((draft) =>
        draft.source === 'NEW' && draft.attachmentType === 'FILE'
          ? [draft.fingerprint]
          : []
      )
    )
    const selectedFingerprints = new Set<string>()
    const uniqueFiles: File[] = []
    let duplicateFound = false
    let invalidFileError: string | undefined

    for (const file of files) {
      if (variant === 'post') {
        try {
          validateUploadFileType(file)
        } catch (error: unknown) {
          invalidFileError ??= `${file.name}: ${getErrorMessage(error)}`
          continue
        }
      }

      const fingerprint = createFileFingerprint(file)
      if (
        existingFingerprints.has(fingerprint) ||
        selectedFingerprints.has(fingerprint)
      ) {
        duplicateFound = true
        continue
      }
      selectedFingerprints.add(fingerprint)
      uniqueFiles.push(file)
    }

    if (draftsRef.current.length + uniqueFiles.length > maxAttachments) {
      setAttachmentError(`첨부는 최대 ${maxAttachments}개까지 추가할 수 있습니다.`)
      return
    }

    const selectionErrors = [
      invalidFileError,
      duplicateFound ? '같은 파일은 중복으로 첨부할 수 없습니다.' : undefined,
    ].filter((message): message is string => Boolean(message))
    setAttachmentError(selectionErrors.join(' ') || undefined)

    const newDrafts: NewFileAttachmentDraft[] = uniqueFiles.map((file) => ({
      localId: createLocalId(),
      source: 'NEW',
      attachmentType: 'FILE',
      file,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      fingerprint: createFileFingerprint(file),
      status: 'WAITING',
    }))
    if (newDrafts.length === 0) return

    commit([...draftsRef.current, ...newDrafts])
    for (const draft of newDrafts) void startUpload(draft.localId)
  }

  const removeDraft = (localId: string) => {
    generationsRef.current.set(
      localId,
      (generationsRef.current.get(localId) ?? 0) + 1
    )
    commit(draftsRef.current.filter((draft) => draft.localId !== localId))
  }

  const addLink = () => {
    const normalizedName = linkName.trim()
    if (!normalizedName) {
      setLinkError('표시 이름을 입력해 주세요.')
      return
    }
    if (!linkUrl.trim()) {
      setLinkError('URL을 입력해 주세요.')
      return
    }
    if (draftsRef.current.length >= maxAttachments) {
      setLinkError(`첨부는 최대 ${maxAttachments}개까지 추가할 수 있습니다.`)
      return
    }

    try {
      const normalizedUrl = validateExternalHttpsUrl(linkUrl)
      const isDuplicate = draftsRef.current.some(
        (draft) =>
          draft.attachmentType === 'LINK' &&
          validateExternalHttpsUrl(draft.linkUrl) === normalizedUrl
      )
      if (isDuplicate) {
        setLinkError('같은 URL은 중복으로 첨부할 수 없습니다.')
        return
      }

      commit([
        ...draftsRef.current,
        {
          localId: createLocalId(),
          source: 'NEW',
          attachmentType: 'LINK',
          fileName: normalizedName,
          linkUrl: normalizedUrl,
        },
      ])
      setLinkName('')
      setLinkUrl('')
      setLinkError(undefined)
      setIsLinkModalOpen(false)
    } catch (error: unknown) {
      setLinkError(getErrorMessage(error))
    }
  }

  const atLimit = value.length >= maxAttachments
  const isPostVariant = variant === 'post'
  const isTaskVariant = variant === 'task'
  const isStyledCardVariant = isPostVariant || isTaskVariant

  const openLinkModal = () => {
    setLinkError(undefined)
    setIsLinkModalOpen(true)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const openNativeFilePicker = () => {
    setIsAttachmentSheetOpen(false)
    fileInputRef.current?.click()
  }

  const openCamera = () => {
    setIsAttachmentSheetOpen(false)
    cameraInputRef.current?.click()
  }

  const openImageLibrary = () => {
    setIsAttachmentSheetOpen(false)
    imageLibraryInputRef.current?.click()
  }

  const selectGoogleDriveFile = async () => {
    if (disabled || atLimit || isGoogleDriveProcessing) return

    setIsAttachmentSheetOpen(false)
    setAttachmentError(undefined)
    setIsGoogleDriveProcessing(true)

    try {
      const selectedFile = await openPersonalGoogleDrivePicker()
      if (!selectedFile || !mountedRef.current) return

      const accessToken = getPersonalGoogleDriveAccessToken()
      if (!accessToken) {
        clearPersonalGoogleDriveAccessToken()
        setAttachmentError(
          'Google 인증이 만료되었습니다. Google Drive를 다시 선택해 주세요.'
        )
        return
      }

      const file = await downloadPersonalGoogleDriveFile(
        selectedFile,
        accessToken
      )
      if (!mountedRef.current) return
      selectFiles([file])
    } catch (error: unknown) {
      if (!mountedRef.current) return
      if (
        error instanceof GoogleDriveFileError &&
        error.code === 'GOOGLE_DRIVE_AUTH_REQUIRED'
      ) {
        clearPersonalGoogleDriveAccessToken()
      }
      setAttachmentError(getGoogleDriveErrorMessage(error))
    } finally {
      if (mountedRef.current) setIsGoogleDriveProcessing(false)
    }
  }

  return (
    <div>
      {!isPostVariant && !isTaskVariant && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-body-sm font-medium text-gray-700">첨부</p>
          <span className="text-caption font-normal text-gray-400">
            {value.length}/{maxAttachments}
          </span>
        </div>
      )}

      {isPostVariant && (
        <div className="flex items-center gap-5 border-b border-gray-200 pb-3">
          <button
            ref={attachmentMenuTriggerRef}
            type="button"
            disabled={disabled || atLimit || isGoogleDriveProcessing}
            aria-haspopup="dialog"
            aria-expanded={isAttachmentSheetOpen}
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="inline-flex items-center gap-1.5 text-body-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300"
          >
            <Paperclip className="h-4 w-4" aria-hidden />
            파일 및 이미지
          </button>
          <button
            type="button"
            disabled={disabled || atLimit}
            onClick={openLinkModal}
            className="inline-flex items-center gap-1.5 text-body-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300"
          >
            <LinkIcon className="h-4 w-4" aria-hidden />
            링크
          </button>
        </div>
      )}

      {value.length > 0 && (
        <ul
          className={`${
            isPostVariant ? 'mt-4' : isTaskVariant ? '' : 'mt-2'
          } flex flex-col gap-2`}
        >
          {value.map((draft) => {
            const isFile = draft.attachmentType === 'FILE'
            const isNewFile = isFile && draft.source === 'NEW'
            const isUploading = isNewFile && draft.status === 'UPLOADING'
            const isFailed = isNewFile && draft.status === 'ERROR'
            const Icon = isFile
              ? isStyledCardVariant && isImageAttachment(draft)
                ? Image
                : FileText
              : LinkIcon

            return (
              <li
                key={draft.localId}
                className={
                  isPostVariant
                    ? 'rounded-md bg-gray-50 px-3 py-3'
                    : isTaskVariant
                      ? 'rounded-md bg-gray-100 px-3 py-3'
                    : 'rounded-md border border-gray-200 bg-white p-3'
                }
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span
                    className={`min-w-0 flex-1 truncate text-body-sm ${
                      isStyledCardVariant
                        ? 'text-blue-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {draft.fileName}
                  </span>
                  {isFile && draft.fileSize !== undefined && (
                    <span className="shrink-0 text-caption font-normal text-gray-400">
                      {formatFileSize(draft.fileSize)}
                    </span>
                  )}
                  {isTaskVariant &&
                    ((isFile && draft.fileSize === undefined) ||
                      !isFile) && (
                      <span className="shrink-0 text-caption font-normal text-gray-400">
                        {isFile ? 'FILE' : '링크'}
                      </span>
                    )}
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`${draft.fileName} 첨부 제거`}
                    onClick={() => removeDraft(draft.localId)}
                    className={`shrink-0 text-gray-400 hover:text-gray-600 disabled:text-gray-200 ${
                      isStyledCardVariant
                        ? 'flex h-7 w-7 items-center justify-center rounded-full bg-white'
                        : ''
                    }`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                {isNewFile && (
                  <div className="mt-1.5 flex items-center justify-between gap-2 pl-6">
                    <span
                      className={`text-caption font-normal ${
                        isFailed ? 'text-error' : 'text-gray-400'
                      }`}
                    >
                      {draft.status === 'WAITING' && '업로드 대기 중'}
                      {draft.status === 'UPLOADING' && '업로드 중'}
                      {draft.status === 'SUCCESS' && '업로드 완료'}
                      {draft.status === 'ERROR' &&
                        (draft.error?.message ?? '업로드에 실패했습니다.')}
                    </span>
                    {isFailed && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void startUpload(draft.localId)}
                        className="inline-flex shrink-0 items-center gap-1 text-caption text-primary disabled:text-gray-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        재시도
                      </button>
                    )}
                    {isUploading && (
                      <span
                        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
                        aria-label="업로드 중"
                      />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isPostVariant && !isTaskVariant && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || atLimit}
            icon={<Paperclip className="h-4 w-4" aria-hidden />}
            onClick={() => fileInputRef.current?.click()}
          >
            파일 선택
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || atLimit || isGoogleDriveProcessing}
            loading={isGoogleDriveProcessing}
            icon={<Cloud className="h-4 w-4" aria-hidden />}
            onClick={() => void selectGoogleDriveFile()}
          >
            Google Drive
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || atLimit}
            icon={<LinkIcon className="h-4 w-4" aria-hidden />}
            onClick={openLinkModal}
          >
            링크 추가
          </Button>
        </div>
      )}

      {isTaskVariant && (
        <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-white px-4 py-4 text-center">
          <p className="text-caption font-normal text-gray-500">
            파일 또는 링크 첨부 (선택)
          </p>
          <p className="mt-1 text-caption font-normal text-gray-400">
            최대 50MB, PDF, PPTX, DOCX, ZIP, IMG
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={disabled || atLimit}
              icon={<Paperclip className="h-4 w-4" aria-hidden />}
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={disabled || atLimit || isGoogleDriveProcessing}
              loading={isGoogleDriveProcessing}
              icon={<Cloud className="h-4 w-4" aria-hidden />}
              onClick={() => void selectGoogleDriveFile()}
            >
              Google Drive
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={disabled || atLimit}
              icon={<LinkIcon className="h-4 w-4" aria-hidden />}
              onClick={openLinkModal}
            >
              링크 추가
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        className="hidden"
        multiple
        accept={`${FILE_ACCEPT},${IMAGE_ACCEPT}`}
        aria-label={
          isPostVariant ? '첨부할 파일 또는 이미지 선택' : '첨부 파일 선택'
        }
        onChange={handleFileInputChange}
      />

      {isPostVariant && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept={IMAGE_ACCEPT}
            capture="environment"
            aria-label="카메라로 첨부할 사진 촬영"
            onChange={handleFileInputChange}
          />
          <input
            ref={imageLibraryInputRef}
            type="file"
            className="hidden"
            multiple
            accept={IMAGE_ACCEPT}
            aria-label="사진 라이브러리에서 첨부할 이미지 선택"
            onChange={handleFileInputChange}
          />
        </>
      )}

      {attachmentError && (
        <p className="mt-2 text-caption font-normal text-error">
          {attachmentError}
        </p>
      )}

      {isGoogleDriveProcessing && (
        <p
          role="status"
          className="mt-2 inline-flex items-center gap-2 text-caption font-normal text-gray-500"
        >
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
          Google Drive 파일을 가져오는 중...
        </p>
      )}

      {isPostVariant && (
        <BottomSheet
          open={isAttachmentSheetOpen}
          onClose={() => setIsAttachmentSheetOpen(false)}
          ariaLabelledby={attachmentSheetTitleId}
        >
          <h2
            id={attachmentSheetTitleId}
            className="text-title font-bold text-gray-900"
          >
            파일 및 이미지 첨부
          </h2>
          <div className="mt-4 flex flex-col">
            <button
              ref={firstAttachmentOptionRef}
              type="button"
              onClick={openNativeFilePicker}
              className="flex min-h-12 items-center gap-3 rounded-md px-2 text-left text-body-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <FolderOpen className="h-5 w-5 text-primary" aria-hidden />
              파일 선택
            </button>
            <button
              type="button"
              disabled={disabled || atLimit || isGoogleDriveProcessing}
              onClick={() => void selectGoogleDriveFile()}
              className="flex min-h-12 items-center gap-3 rounded-md px-2 text-left text-body-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:text-gray-300"
            >
              <Cloud className="h-5 w-5 text-primary" aria-hidden />
              Google Drive
            </button>
            {canUseCameraCapture && (
              <button
                type="button"
                onClick={openCamera}
                className="flex min-h-12 items-center gap-3 rounded-md px-2 text-left text-body-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Camera className="h-5 w-5 text-primary" aria-hidden />
                사진 촬영
              </button>
            )}
            <button
              type="button"
              onClick={openImageLibrary}
              className="flex min-h-12 items-center gap-3 rounded-md px-2 text-left text-body-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Images className="h-5 w-5 text-primary" aria-hidden />
              사진 라이브러리
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsAttachmentSheetOpen(false)}
            className="mt-3 bg-gray-100 text-gray-500"
          >
            취소
          </Button>
        </BottomSheet>
      )}

      <Modal
        open={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      >
        <h2 className="text-title font-bold text-gray-900">링크 첨부</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="표시 이름"
            value={linkName}
            maxLength={255}
            onChange={(event) => {
              setLinkName(event.target.value)
              setLinkError(undefined)
            }}
            placeholder="링크 이름"
          />
          <Input
            label="URL"
            type="url"
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value)
              setLinkError(undefined)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addLink()
              }
            }}
            errorText={linkError}
            placeholder="https://example.com"
          />
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            fullWidth={false}
            onClick={() => setIsLinkModalOpen(false)}
            className="flex-1 bg-gray-100 text-gray-400"
          >
            취소
          </Button>
          <Button
            type="button"
            fullWidth={false}
            onClick={addLink}
            className="flex-1 text-white"
          >
            추가
          </Button>
        </div>
      </Modal>
    </div>
  )
}
