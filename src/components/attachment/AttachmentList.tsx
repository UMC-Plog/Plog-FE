import {
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  downloadFileAttachment,
  openExternalLink,
} from '../../api/attachment'
import { ApiError } from '../../api/client'
import { formatFileSize } from '../../lib/attachment'
import { cn } from '../../lib/utils'
import type { NormalizedAttachment } from '../../types/attachment'

interface AttachmentListProps {
  attachments: NormalizedAttachment[]
  variant?: 'default' | 'subtle'
  canDelete?: boolean
  onDelete?: (attachment: NormalizedAttachment) => void
  deletingAttachmentId?: number | null
  emptyContent?: ReactNode
  className?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : '첨부를 열지 못했습니다. 다시 시도해 주세요.'
}

export function AttachmentList({
  attachments,
  variant = 'default',
  canDelete = false,
  onDelete,
  deletingAttachmentId = null,
  emptyContent = null,
  className,
}: AttachmentListProps) {
  const mountedRef = useRef(true)
  const openingIdsRef = useRef(new Set<number>())
  const [openingAttachmentIds, setOpeningAttachmentIds] = useState<
    Set<number>
  >(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    const openingIds = openingIdsRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      openingIds.clear()
    }
  }, [])

  useEffect(() => {
    const currentIds = new Set(
      attachments.map((attachment) => attachment.attachmentId)
    )
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([attachmentId]) =>
          currentIds.has(Number(attachmentId))
        )
      )
    )
  }, [attachments])

  const openItem = async (attachment: NormalizedAttachment) => {
    const { attachmentId } = attachment
    if (
      openingIdsRef.current.has(attachmentId) ||
      deletingAttachmentId === attachmentId
    ) {
      return
    }

    openingIdsRef.current.add(attachmentId)
    setOpeningAttachmentIds((current) => {
      const next = new Set(current)
      next.add(attachmentId)
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      delete next[attachmentId]
      return next
    })

    try {
      if (attachment.attachmentType === 'FILE') {
        await downloadFileAttachment(attachment.downloadUrlApi)
      } else {
        openExternalLink(attachment.linkUrl)
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        setErrors((current) => ({
          ...current,
          [attachmentId]: getErrorMessage(error),
        }))
      }
    } finally {
      openingIdsRef.current.delete(attachmentId)
      if (mountedRef.current) {
        setOpeningAttachmentIds((current) => {
          const next = new Set(current)
          next.delete(attachmentId)
          return next
        })
      }
    }
  }

  if (attachments.length === 0) {
    return emptyContent === null ? null : <>{emptyContent}</>
  }

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {attachments.map((attachment) => {
        const isFile = attachment.attachmentType === 'FILE'
        const isOpening = openingAttachmentIds.has(attachment.attachmentId)
        const isDeleting =
          deletingAttachmentId === attachment.attachmentId
        const TypeIcon = isFile ? FileText : LinkIcon
        const ActionIcon = isFile ? Download : ExternalLink
        const actionLabel = isFile ? '다운로드' : '링크 열기'
        const error = errors[attachment.attachmentId]

        return (
          <li
            key={attachment.attachmentId}
            className={cn(
              'rounded-md p-3 transition-colors',
              variant === 'subtle'
                ? 'bg-gray-100 hover:bg-gray-200/60'
                : 'border border-gray-200 bg-white'
            )}
          >
            <div className="flex items-center gap-2">
              <TypeIcon
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-gray-700">
                  {attachment.fileName}
                </p>
                <p className="mt-0.5 text-caption font-normal text-gray-400">
                  {isFile
                    ? attachment.fileSize === null
                      ? 'FILE'
                      : `FILE · ${formatFileSize(attachment.fileSize)}`
                    : 'LINK'}
                </p>
              </div>

              <button
                type="button"
                disabled={isOpening || isDeleting}
                aria-label={`${attachment.fileName} ${actionLabel}`}
                onClick={() => void openItem(attachment)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-caption text-primary hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:text-gray-300"
              >
                {isOpening ? (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                ) : (
                  <ActionIcon className="h-3.5 w-3.5" aria-hidden />
                )}
                {isOpening ? '여는 중' : actionLabel}
              </button>

              {canDelete && onDelete && (
                <button
                  type="button"
                  disabled={isOpening || isDeleting}
                  aria-label={`${attachment.fileName} 첨부 삭제`}
                  onClick={() => onDelete(attachment)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30 disabled:text-gray-200"
                >
                  {isDeleting ? (
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden
                    />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </button>
              )}
            </div>

            {error && (
              <p
                className="mt-2 pl-6 text-caption font-normal text-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
