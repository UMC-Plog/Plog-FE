import { UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { TextArea } from '../../../components/TextArea'
import { ApiError } from '../../../api/client'
import {
  createPost as requestCreatePost,
  fetchPostDetail,
  updatePost as requestUpdatePost,
} from '../../../api/postApi'
import {
  getAttachmentDraftSummary,
  toAttachmentRequests,
} from '../../../lib/attachment'
import { useAuthStore } from '../../../store/authStore'
import { useProjectStore } from '../../../store/projectStore'
import type {
  PostDetailViewModel,
  ServerPostUpdateRequest,
} from '../../../types/post'
import { PostAuthorAvatar } from '../../../components/post/PostAuthorAvatar'
import { AttachmentPicker } from '../../../components/attachment/AttachmentPicker'
import type { AttachmentDraft } from '../../../types/attachment'

function mapExistingAttachments(
  post: PostDetailViewModel
): AttachmentDraft[] {
  return post.attachments.map((attachment) =>
    attachment.type === 'FILE'
      ? {
          localId: `server-${attachment.id}`,
          source: 'SERVER',
          attachmentType: 'FILE',
          attachmentId: attachment.id,
          fileId: attachment.fileId,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          downloadUrlApi: attachment.downloadUrlApi,
        }
      : {
          localId: `server-${attachment.id}`,
          source: 'SERVER',
          attachmentType: 'LINK',
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          linkUrl: attachment.linkUrl!,
        }
  )
}

function getAttachmentSignature(drafts: AttachmentDraft[]) {
  return drafts
    .map((draft) => {
      if (draft.source === 'SERVER') return `SERVER:${draft.attachmentId}`
      if (draft.attachmentType === 'LINK') {
        return `LINK:${draft.fileName}:${draft.linkUrl}`
      }
      return `FILE:${draft.fileKey ?? draft.fingerprint}`
    })
    .join('|')
}

export default function PostFormPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentProject = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)
  )
  const isEditMode = Boolean(postId)
  const submittingRef = useRef(false)
  const [existingPost, setExistingPost] = useState<PostDetailViewModel>()
  const [isEditLoading, setIsEditLoading] = useState(isEditMode)
  const [editLoadError, setEditLoadError] = useState<string>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [initialAttachmentSignature, setInitialAttachmentSignature] =
    useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contentTouched, setContentTouched] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string>()

  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === user?.avatarId)
  const avatarSrc = user?.avatarImageUrl ?? avatarPreset?.src
  const authorName =
    existingPost?.authorNickname ??
    user?.nickname ??
    user?.realName ??
    '알 수 없는 사용자'
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()
  const attachmentSummary = useMemo(
    () => getAttachmentDraftSummary(attachments),
    [attachments]
  )
  const attachmentSignature = getAttachmentSignature(attachments)
  const attachmentsChanged =
    isEditMode && attachmentSignature !== initialAttachmentSignature
  const numericProjectId =
    projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
      ? Number(projectId)
      : null
  const numericPostId =
    postId && /^[1-9]\d*$/.test(postId) && Number.isSafeInteger(Number(postId))
      ? Number(postId)
      : null
  const titleError =
    titleTouched && normalizedTitle.length === 0
      ? '게시글 제목을 입력해 주세요.'
      : normalizedTitle.length > 100
        ? '게시글 제목은 100자 이하로 입력해 주세요.'
        : undefined
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
      normalizedTitle.length >= 1 &&
      normalizedTitle.length <= 100 &&
      normalizedContent.length >= 1 &&
      normalizedContent.length <= 5000 &&
      !attachmentSummary.hasPendingUploads &&
      !attachmentSummary.hasUploadErrors &&
      numericProjectId !== null &&
      (!isEditMode ||
        (numericPostId !== null &&
          existingPost &&
          (normalizedTitle !== existingPost.title ||
            normalizedContent !== existingPost.content ||
            attachmentsChanged)))
  )

  useEffect(() => {
    if (!isEditMode) return
    if (numericProjectId === null || numericPostId === null) {
      setEditLoadError('올바른 게시글 경로가 아닙니다.')
      setIsEditLoading(false)
      return
    }

    let active = true
    setIsEditLoading(true)
    setEditLoadError(undefined)
    void fetchPostDetail(numericProjectId, numericPostId)
      .then((response) => {
        if (!active) return
        setExistingPost(response)
        setTitle(response.title)
        setContent(response.content)
        const existingAttachments = mapExistingAttachments(response)
        setAttachments(existingAttachments)
        setInitialAttachmentSignature(
          getAttachmentSignature(existingAttachments)
        )
      })
      .catch((error: unknown) => {
        if (!active) return
        setEditLoadError(
          error instanceof ApiError
            ? error.message
            : '게시글을 불러오지 못했습니다.'
        )
      })
      .finally(() => {
        if (active) setIsEditLoading(false)
      })
    return () => {
      active = false
    }
  }, [isEditMode, numericPostId, numericProjectId])

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

  const handleSubmit = async () => {
    if (!canSubmit || !projectId || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(undefined)

    if (numericProjectId === null) {
      setSubmitError('올바른 프로젝트 ID가 아니어서 게시글을 작성할 수 없습니다.')
      setIsSubmitting(false)
      submittingRef.current = false
      return
    }

    try {
      if (isEditMode && numericPostId !== null && existingPost) {
        const payload: ServerPostUpdateRequest = {}
        if (normalizedTitle !== existingPost.title) {
          payload.title = normalizedTitle
        }
        if (normalizedContent !== existingPost.content) {
          payload.content = normalizedContent
        }
        if (attachmentsChanged) {
          payload.attachments = toAttachmentRequests(attachments)
        }
        await requestUpdatePost(numericProjectId, numericPostId, payload)
        navigate(`/project/${projectId}/posts/${numericPostId}`, {
          replace: true,
        })
        return
      }
      const attachmentRequests = toAttachmentRequests(attachments)
      await requestCreatePost(numericProjectId, {
        title: normalizedTitle,
        content: normalizedContent,
        ...(attachmentRequests.length > 0
          ? { attachments: attachmentRequests }
          : {}),
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

  if (isEditMode && (isEditLoading || editLoadError || !existingPost)) {
    return (
      <Layout>
        <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
          <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={handleCancel} className="justify-self-start px-0 text-gray-500">
            취소
          </Button>
          <h1 className="text-center text-body font-semibold text-gray-900">
            {isEditMode ? '게시글 수정' : '게시글 작성'}
          </h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-title font-bold text-gray-700">
            {isEditLoading ? '게시글을 불러오는 중이에요' : '게시글을 찾을 수 없어요'}
          </p>
          {editLoadError && (
            <p className="mt-2 text-body-sm text-error">{editLoadError}</p>
          )}
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
        <h1 className="text-center text-body font-semibold text-gray-900">
          {isEditMode ? '게시글 수정' : '게시글 작성'}
        </h1>
        <Button type="button" size="sm" fullWidth={false} disabled={!canSubmit} onClick={() => void handleSubmit()} className="hidden justify-self-end text-white sm:inline-flex">
          {isSubmitting
            ? isEditMode
              ? '수정 중'
              : '게시 중'
            : isEditMode
              ? '수정'
              : '게시'}
        </Button>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:pb-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {existingPost ? (
              <PostAuthorAvatar profilePreset={existingPost.profilePreset} />
            ) : avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5 text-gray-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-gray-900">{authorName}</p>
            {currentProject && (
              <p className="truncate text-caption font-normal text-gray-400">
                {currentProject.name}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Input
            aria-label="게시글 제목"
            placeholder="게시글 제목을 입력하세요"
            value={title}
            maxLength={100}
            errorText={titleError}
            onBlur={() => setTitleTouched(true)}
            onChange={(event) => {
              setTitle(event.target.value)
              setSubmitError(undefined)
            }}
          />
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

        <div className="mt-5">
          <AttachmentPicker
            value={attachments}
            onChange={(nextAttachments) => {
              setAttachments(nextAttachments)
              setSubmitError(undefined)
            }}
            usage="POST"
            variant="post"
            disabled={isSubmitting}
          />
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-mobile px-5 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">
        <Button
          type="button"
          size="sm"
          fullWidth={false}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="pointer-events-auto ml-auto text-white shadow-lg"
        >
          {isSubmitting
            ? isEditMode
              ? '수정 중'
              : '게시 중'
            : isEditMode
              ? '수정'
              : '게시'}
        </Button>
      </div>
    </Layout>
  )
}
