import {
  FileText,
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
import { ApiError } from '../../api/client'
import { uploadFile } from '../../api/file'
import {
  createFileFingerprint,
  formatFileSize,
  getAttachmentDraftSummary,
  validateExternalHttpsUrl,
} from '../../lib/attachment'
import {
  MAX_ATTACHMENTS,
  type AttachmentDraft,
  type AttachmentDraftSummary,
  type NewFileAttachmentDraft,
} from '../../types/attachment'
import type { FileUploadUsage } from '../../types/file'
import { Button } from '../Button'
import { Input } from '../Input'
import { Modal } from '../Modal'

interface AttachmentPickerProps {
  value: AttachmentDraft[]
  onChange: (drafts: AttachmentDraft[]) => void
  usage: FileUploadUsage
  maxAttachments?: number
  disabled?: boolean
  onStatusChange?: (summary: AttachmentDraftSummary) => void
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : '첨부 처리 중 오류가 발생했습니다.'
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
  onStatusChange,
}: AttachmentPickerProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftsRef = useRef(value)
  const generationsRef = useRef(new Map<string, number>())
  const mountedRef = useRef(true)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const [attachmentError, setAttachmentError] = useState<string>()

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
    onStatusChange?.(getAttachmentDraftSummary(value, maxAttachments))
  }, [maxAttachments, onStatusChange, value])

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

    for (const file of files) {
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

    if (duplicateFound) {
      setAttachmentError('같은 파일은 중복으로 첨부할 수 없습니다.')
    }

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

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm font-medium text-gray-700">첨부</p>
        <span className="text-caption font-normal text-gray-400">
          {value.length}/{maxAttachments}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {value.map((draft) => {
            const isFile = draft.attachmentType === 'FILE'
            const isNewFile = isFile && draft.source === 'NEW'
            const isUploading = isNewFile && draft.status === 'UPLOADING'
            const isFailed = isNewFile && draft.status === 'ERROR'
            const Icon = isFile ? FileText : LinkIcon

            return (
              <li
                key={draft.localId}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-body-sm text-gray-700">
                    {draft.fileName}
                  </span>
                  {isFile && draft.fileSize !== undefined && (
                    <span className="shrink-0 text-caption font-normal text-gray-400">
                      {formatFileSize(draft.fileSize)}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`${draft.fileName} 첨부 제거`}
                    onClick={() => removeDraft(draft.localId)}
                    className="shrink-0 text-gray-400 hover:text-gray-600 disabled:text-gray-200"
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
          disabled={disabled || atLimit}
          icon={<LinkIcon className="h-4 w-4" aria-hidden />}
          onClick={() => {
            setLinkError(undefined)
            setIsLinkModalOpen(true)
          }}
        >
          링크 추가
        </Button>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.pptx,.docx,.zip,.fig,.jpg,.jpeg,.png,.webp,.gif"
        aria-label="첨부 파일 선택"
        onChange={(event) => {
          selectFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />

      {attachmentError && (
        <p className="mt-2 text-caption font-normal text-error">
          {attachmentError}
        </p>
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
