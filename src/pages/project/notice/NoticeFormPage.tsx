import { UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import { createPost as requestCreatePost } from '../../../api/postApi'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { TextArea } from '../../../components/TextArea'
import { useAuthStore } from '../../../store/authStore'
import { useProjectStore } from '../../../store/projectStore'

export default function NoticeFormPage() {
  const { id: projectId, noticeId } = useParams<{ id: string; noticeId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentProject = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)
  )
  const isEditMode = Boolean(noticeId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentTouched, setContentTouched] = useState(false)
  const [titleTouched, setTitleTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const submittingRef = useRef(false)

  const author = user
  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === author?.avatarId)
  const avatarSrc = author?.avatarImageUrl ?? avatarPreset?.src
  const authorName = user?.nickname || user?.realName || '사용자'
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()
  const numericProjectId =
    projectId && /^[1-9]\d*$/.test(projectId) && Number.isSafeInteger(Number(projectId))
      ? Number(projectId)
      : null
  const titleError =
    titleTouched && normalizedTitle.length === 0
      ? '공지 제목을 입력해 주세요.'
      : normalizedTitle.length > 100
        ? '공지 제목은 100자 이하로 입력해 주세요.'
        : undefined
  const contentError =
    contentTouched && normalizedContent.length === 0
      ? '공지 내용을 입력해 주세요.'
      : normalizedContent.length > 5000
        ? '공지 내용은 5000자 이하로 입력해 주세요.'
        : undefined
  const canSubmit = Boolean(
    !isSubmitting &&
      !isEditMode &&
      numericProjectId !== null &&
      normalizedTitle.length >= 1 &&
      normalizedTitle.length <= 100 &&
      normalizedContent.length >= 1 &&
      normalizedContent.length <= 5000 &&
      user
  )

  const handleCancel = () => {
    if (!projectId) return
    if (isEditMode && noticeId) {
      navigate(`/project/${projectId}/notices`)
      return
    }
    navigate(`/project/${projectId}/feed`)
  }

  const handleSubmit = async () => {
    if (!canSubmit || !projectId || submittingRef.current) return

    if (numericProjectId === null) {
      setSubmitError('올바른 프로젝트 경로가 아니어서 공지를 작성할 수 없습니다.')
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(undefined)

    try {
      await requestCreatePost(numericProjectId, {
        title: normalizedTitle,
        content: normalizedContent,
        isNotice: true,
      })
      navigate(`/project/${numericProjectId}/feed`, { replace: true })
    } catch (error: unknown) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (isEditMode) {
    return (
      <Layout>
        <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={handleCancel}
            className="justify-self-start px-0 text-gray-500"
          >
            취소
          </Button>
          <h1 className="text-center text-body font-semibold text-gray-900">공지 작성</h1>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-title font-bold text-gray-700">
            공지 수정은 아직 지원하지 않아요
          </p>
          <p className="mt-1.5 text-body-sm text-gray-400">
            백엔드 수정 API가 제공되면 연결할 예정입니다.
          </p>
          <Button type="button" size="sm" fullWidth={false} onClick={handleCancel} className="mt-6">
            돌아가기
          </Button>
        </main>
      </Layout>
    )
  }

  return (
    <Layout>
      <header className="grid h-12 grid-cols-3 items-center border-b border-gray-200 bg-white px-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onClick={handleCancel}
          className="justify-self-start px-0 text-gray-500"
        >
          취소
        </Button>
        <h1 className="text-center text-body font-semibold text-gray-900">공지 작성</h1>
        <Button
          type="button"
          size="sm"
          fullWidth={false}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="justify-self-end text-white"
        >
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
            {currentProject && (
              <p className="truncate text-caption font-normal text-gray-400">
                {currentProject.name}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Input
            aria-label="공지 제목"
            placeholder="공지 제목을 입력하세요"
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
            aria-label="공지 내용"
            placeholder={'공지 내용을 자세히 입력해 주세요\n팀원들이 확인해야 할 정보를 포함해 주세요'}
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
        {submitError && (
          <p className="mt-2 text-caption font-normal text-error">{submitError}</p>
        )}
      </main>
    </Layout>
  )
}
