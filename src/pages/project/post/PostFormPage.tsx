import { FileText, Image, Link, UserRound, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { TextArea } from '../../../components/TextArea'
import { TEMP_PROJECT_NAME } from '../../../lib/project'
import { useAuthStore } from '../../../store/authStore'
import { usePostStore } from '../../../store/postStore'
import type { PostAttachment } from '../../../types/post'

export default function PostFormPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const createPost = usePostStore((state) => state.createPost)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<PostAttachment[]>([])
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === user?.avatarId)
  const avatarSrc = user?.avatarImageUrl ?? avatarPreset?.src
  const authorName = user?.nickname || user?.realName || '사용자'
  const canSubmit = Boolean(projectId && user && title.trim() && content.trim() && !isSubmitting)

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const addFiles = (files: FileList | null, type: 'file' | 'image') => {
    if (!files) return
    const nextAttachments = Array.from(files).map<PostAttachment>((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type,
      size: file.size,
    }))
    setAttachments((current) => [...current, ...nextAttachments])
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

  const handleSubmit = () => {
    if (!canSubmit || !projectId || !user || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)

    createPost({
      projectId,
      title: title.trim(),
      content: content.trim(),
      author: {
        id: user.id,
        nickname: authorName,
        avatarId: user.avatarId,
        avatarImageUrl: user.avatarImageUrl,
      },
      attachments,
    })
    goToFeed()
  }

  return (
    <Layout>
      <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
        <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={goToFeed} className="justify-self-start px-0 text-gray-500">
          취소
        </Button>
        <h1 className="text-center text-body font-semibold text-gray-900">게시글 작성</h1>
        <Button type="button" size="sm" fullWidth={false} disabled={!canSubmit} onClick={handleSubmit} className="justify-self-end text-white">
          게시
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
          <Input aria-label="게시글 제목" placeholder="게시글 제목을 입력하세요" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextArea aria-label="게시글 내용" placeholder={'팀원들에게 공유할 내용을 입력하세요\n@멘션, 파일 첨부가 가능합니다'} value={content} onChange={(event) => setContent(event.target.value)} className="min-h-60" />
        </div>

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
      </main>
    </Layout>
  )
}
