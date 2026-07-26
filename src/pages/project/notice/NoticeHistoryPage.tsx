import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../../../components/EmptyState'
import { Layout } from '../../../components/Layout'
import { NoticeHistoryItem } from '../../../components/notice/NoticeHistoryItem'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { TopNavBar } from '../../../components/TopNavBar'
import { useNoticeStore } from '../../../store/noticeStore'

export default function NoticeHistoryPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const allNotices = useNoticeStore((state) => state.notices)
  const deleteNotice = useNoticeStore((state) => state.deleteNotice)
  const [openMenuNoticeId, setOpenMenuNoticeId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const projectNotices = useMemo(
    () =>
      projectId
        ? allNotices
            .filter((notice) => notice.projectId === projectId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [allNotices, projectId]
  )

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return
    deleteNotice(deleteTargetId)
    setDeleteTargetId(null)
  }

  return (
    <Layout>
      <TopNavBar title="공지" onBack={goToFeed} />

      <main className="flex flex-1 flex-col bg-gray-25">
        {projectNotices.length === 0 ? (
          <EmptyState
            title="아직 공지가 없어요"
            description="새로운 공지가 등록되면 이곳에서 확인할 수 있어요"
          />
        ) : (
          <div className="space-y-6 px-4 py-5">
            {projectNotices.map((notice) => (
              <NoticeHistoryItem
                key={notice.id}
                notice={notice}
                isMenuOpen={openMenuNoticeId === notice.id}
                onToggleMenu={() =>
                  setOpenMenuNoticeId((currentId) =>
                    currentId === notice.id ? null : notice.id
                  )
                }
                onCloseMenu={() => setOpenMenuNoticeId(null)}
                onEdit={() =>
                  projectId &&
                  navigate(`/project/${projectId}/notices/${notice.id}/edit`)
                }
                onDelete={() => setDeleteTargetId(notice.id)}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="공지를 삭제하시겠습니까?"
        description="삭제된 공지는 복구할 수 없어요"
        confirmText="삭제하기"
        cancelText="취소"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Layout>
  )
}
