import { FileText, Image, Link, UserRound, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { TextArea } from '../../../components/TextArea'
import { ApiError } from '../../../api/client'
import { createPost as requestCreatePost } from '../../../api/postApi'
import {
  isAttachmentSizeValid,
  MAX_ATTACHMENT_SIZE_ERROR,
} from '../../../lib/attachment'
import { TEMP_PROJECT_NAME } from '../../../lib/project'
import { useAuthStore } from '../../../store/authStore'
import { usePostStore } from '../../../store/postStore'
import type { PostAttachment } from '../../../types/post'

export default function PostFormPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const posts = usePostStore((state) => state.posts)
  const updatePost = usePostStore((state) => state.updatePost)
  const existingPost = posts.find(
    (post) => post.id === postId && post.projectId === projectId
  )
  const isEditMode = Boolean(postId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [title, setTitle] = useState(existingPost?.title ?? '')
  const [content, setContent] = useState(existingPost?.content ?? '')
  const [attachments, setAttachments] = useState<PostAttachment[]>(
    existingPost?.attachments ?? []
  )
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const [attachmentError, setAttachmentError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentTouched, setContentTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string>()

  const author = existingPost?.author ?? user
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === author?.avatarId)
  const avatarSrc = author?.avatarImageUrl ?? avatarPreset?.src
  const authorName = existingPost?.author.nickname || user?.nickname || user?.realName || '사용자'
  const normalizedContent = content.trim()
  const numericProjectId =
    projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
      ? Number(projectId)
      : null
  const contentError =
    contentTouched && normalizedContent.length === 0
      ? '게시글 내용을 입력해 주세요'
      : normalizedContent.length > 5000
        ? '게시글 내용은 5000자 이하로 입력해 주세요'
        : undefined
  const projectIdError =
    !isEditMode && numericProjectId === null
      ? '올바른 프로젝트 ID가 아니어서 게시글을 작성할 수 없습니다.'
      : undefined
  const canSubmit = Boolean(
    !isSubmitting &&
      (isEditMode
        ? projectId && title.trim() && normalizedContent && existingPost
        : numericProjectId !== null &&
          normalizedContent.length >= 1 &&
          normalizedContent.length <= 5000)
  )

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const handleCancel = () => {
    if (!projectId) return
    if (isEditMode && postId && existingPost) {
      navigate(`/project/${projectId}/posts/${postId}`)
      return
    }
    goToFeed()
  }

  const addFiles = (files: FileList | null, type: 'file' | 'image') => {
    if (!files) return
    const selectedFiles = Array.from(files)
    const validFiles = selectedFiles.filter(isAttachmentSizeValid)
    const nextAttachments = validFiles.map<PostAttachment>((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type,
      size: file.size,
    }))
    if (nextAttachments.length > 0) {
      setAttachments((current) => [...current, ...nextAttachments])
    }
    setAttachmentError(
      validFiles.length === selectedFiles.length
        ? undefined
        : MAX_ATTACHMENT_SIZE_ERROR
    )
  }

  const addLink = () => {
    try {
      const url = new URL(linkUrl.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()

      setAttachments((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: url.hostname,
          type: 'link',
          url: url.toString(),
        },
      ])
      setLinkUrl('')
      setLinkError(undefined)
      setIsLinkInputOpen(false)
    } catch {
      setLinkError('http 또는 https로 시작하는 주소를 입력해 주세요')
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || !projectId || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(undefined)

    if (isEditMode && postId) {
      updatePost(projectId, postId, {
        title: title.trim(),
        content: normalizedContent,
        attachments,
      })
      navigate(`/project/${projectId}/posts/${postId}`, { replace: true })
      return
    }

    if (numericProjectId === null) {
      setSubmitError('올바른 프로젝트 ID가 아니어서 게시글을 작성할 수 없습니다.')
      setIsSubmitting(false)
      submittingRef.current = false
      return
    }

    try {
      await requestCreatePost(numericProjectId, {
        content: normalizedContent,
      })
      navigate(`/project/${projectId}/feed`, { replace: true })
    } catch (error: unknown) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  if (isEditMode && !existingPost) {
    return (
      <Layout>
        <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
          <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={handleCancel} className="justify-self-start px-0 text-gray-500">
            취소
          </Button>
          <h1 className="text-center text-body font-semibold text-gray-900">게시글 작성</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-title font-bold text-gray-700">게시글을 찾을 수 없어요</p>
          <Button type="button" size="sm" fullWidth={false} onClick={goToFeed} className="mt-6">
            피드로 돌아가기
          </Button>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
        <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={handleCancel} className="justify-self-start px-0 text-gray-500">
          취소
        </Button>
        <h1 className="text-center text-body font-semibold text-gray-900">게시글 작성</h1>
        <Button type="button" size="sm" fullWidth={false} disabled={!canSubmit} onClick={() => void handleSubmit()} className="justify-self-end text-white">
          {isSubmitting ? '게시 중' : '게시'}
        </Button>
      </header>

      <main className="flex flex-1 flex-col px-5 py-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-gray-900">{authorName}</p>
            <p className="truncate text-caption font-normal text-gray-400">{TEMP_PROJECT_NAME}</p>
          </div>
        </div>

        <div className="space-y-4">
          {isEditMode && (
            <Input aria-label="게시글 제목" placeholder="게시글 제목을 입력하세요" value={title} onChange={(event) => setTitle(event.target.value)} />
          )}
          <TextArea
            aria-label="게시글 내용"
            placeholder="팀원들에게 공유할 내용을 입력하세요"
            value={content}
            maxLength={5000}
            errorText={contentError}
            onBlur={() => setContentTouched(true)}
            onChange={(event) => {
              setContent(event.target.value)
              setSubmitError(undefined)
            }}
            className="min-h-60"
          />
        </div>

        {(projectIdError || submitError) && (
          <p className="mt-2 text-caption font-normal text-error">
            {projectIdError ?? submitError}
          </p>
        )}

        {isEditMode && (
          <>
        <div className="mt-4 flex items-center gap-5 border-b border-gray-200 pb-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-caption font-normal text-gray-500">
            <FileText className="h-4 w-4" aria-hidden /> 파일
          </button>
          <button type="button" onClick={() => setIsLinkInputOpen((isOpen) => !isOpen)} className="flex items-center gap-1.5 text-caption font-normal text-gray-500">
            <Link className="h-4 w-4" aria-hidden /> 링크
          </button>
          <button type="button" onClick={() => imageInputRef.current?.click()} className="flex items-center gap-1.5 text-caption font-normal text-gray-500">
            <Image className="h-4 w-4" aria-hidden /> 이미지
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => { addFiles(event.target.files, 'file'); event.target.value = '' }} />
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files, 'image'); event.target.value = '' }} />
        </div>

        {attachmentError && (
          <p className="mt-2 text-caption font-normal text-error">{attachmentError}</p>
        )}

        {isLinkInputOpen && (
          <div className="mt-3 flex items-start gap-2">
            <Input aria-label="첨부 링크" type="url" placeholder="https://example.com" value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(undefined) }} errorText={linkError} />
            <Button type="button" size="md" fullWidth={false} disabled={!linkUrl.trim()} onClick={addLink} className="shrink-0 whitespace-nowrap text-white">추가</Button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachments.map((attachment) => {
              const AttachmentIcon = attachment.type === 'link' ? Link : attachment.type === 'image' ? Image : FileText
              return (
                <div key={attachment.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-3">
                  <AttachmentIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-body-sm text-blue-600">{attachment.name}</p>
                  {attachment.size !== undefined && <span className="shrink-0 text-caption font-normal text-gray-400">{attachment.size < 1024 * 1024 ? `${Math.ceil(attachment.size / 1024)}KB` : `${(attachment.size / 1024 / 1024).toFixed(1)}MB`}</span>}
                  <button type="button" aria-label={`${attachment.name} 첨부 제거`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>
        )}
          </>
        )}
      </main>
    </Layout>
  )
}
