import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AVATAR_PRESETS } from '../../../components/AvatarPicker'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Layout } from '../../../components/Layout'
import { TextArea } from '../../../components/TextArea'
import { useAuthStore } from '../../../store/authStore'
import { useNoticeStore } from '../../../store/noticeStore'

const TEMP_PROJECT_NAME = '테스트 프로젝트'

export default function NoticeEditorPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const createNotice = useNoticeStore((state) => state.createNotice)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const avatarPreset = AVATAR_PRESETS.find((avatar) => avatar.id === user?.avatarId)
  const avatarSrc = user?.avatarImageUrl ?? avatarPreset?.src
  const authorName = user?.nickname || user?.realName || '사용자'
  const canSubmit = Boolean(projectId && user && title.trim() && content.trim())

  const handleCancel = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const handleSubmit = () => {
    if (!canSubmit || !projectId || !user) return

    createNotice({
      projectId,
      title: title.trim(),
      content: content.trim(),
      author: {
        id: user.id,
        nickname: authorName,
        avatarId: user.avatarId,
        avatarImageUrl: user.avatarImageUrl,
      },
    })
    navigate(`/project/${projectId}/feed`)
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
          onClick={handleSubmit}
          className="justify-self-end"
        >
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
          <Input
            aria-label="공지 제목"
            placeholder="공지 제목을 입력하세요"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextArea
            aria-label="공지 내용"
            placeholder={'공지 내용을 자세히 입력해 주세요\n팀원들이 확인해야 할 정보를 포함해 주세요'}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-60"
          />
        </div>
      </main>
    </Layout>
  )
}
