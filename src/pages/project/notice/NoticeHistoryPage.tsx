import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import {
  deletePost as requestDeletePost,
  fetchPostNotices,
} from '../../../api/postApi'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { Layout } from '../../../components/Layout'
import { NoticeHistoryItem } from '../../../components/notice/NoticeHistoryItem'
import { TopNavBar } from '../../../components/TopNavBar'
import type { PostListItemViewModel } from '../../../types/post'
import { useProjectStore } from '../../../store/projectStore'

function parsePositiveSafeInteger(value: string | undefined) {
  return value &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Number(value)
    : null
}

export default function NoticeHistoryPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numericProjectId = parsePositiveSafeInteger(projectId)
  const currentProject = useProjectStore((state) =>
    state.projects.find((project) => project.id === projectId)
  )
  const [notices, setNotices] = useState<PostListItemViewModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [openMenuPostId, setOpenMenuPostId] = useState<number | null>(null)
  const [pendingDeleteNotice, setPendingDeleteNotice] =
    useState<PostListItemViewModel>()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const requestIdRef = useRef(0)
  const deletingRef = useRef(false)
  const inFlightRef = useRef<{
    projectId: number
    request: ReturnType<typeof fetchPostNotices>
  } | null>(null)

  const goToFeed = () => {
    if (projectId) navigate(`/project/${projectId}/feed`)
  }

  const loadNotices = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setNotices([])
    setIsLoading(true)
    setError(undefined)

    if (numericProjectId === null) {
      setError('올바른 프로젝트 경로가 아니어서 공지를 불러올 수 없습니다.')
      setIsLoading(false)
      return
    }

    try {
      const request =
        inFlightRef.current?.projectId === numericProjectId
          ? inFlightRef.current.request
          : fetchPostNotices(numericProjectId)
      inFlightRef.current = { projectId: numericProjectId, request }
      const response = await request
      if (requestId !== requestIdRef.current) return
      setNotices(response)
    } catch (requestError: unknown) {
      if (requestId !== requestIdRef.current) return
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
    } finally {
      if (inFlightRef.current?.projectId === numericProjectId) {
        inFlightRef.current = null
      }
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [numericProjectId])

  useEffect(() => {
    void loadNotices()
    return () => {
      requestIdRef.current += 1
    }
  }, [loadNotices])

  const canManageNotice = useCallback(
    (notice: PostListItemViewModel) =>
      currentProject !== undefined &&
      Number.isSafeInteger(currentProject.myProjectMemberId) &&
      currentProject.myProjectMemberId > 0 &&
      currentProject.myProjectMemberId === notice.projectMemberId,
    [currentProject]
  )

  const handleEdit = (notice: PostListItemViewModel) => {
    if (!canManageNotice(notice)) return
    setOpenMenuPostId(null)
    navigate(`/project/${notice.projectId}/notices/${notice.postId}/edit`)
  }

  const handleDelete = (notice: PostListItemViewModel) => {
    if (!canManageNotice(notice)) return
    setOpenMenuPostId(null)
    setDeleteError(undefined)
    setPendingDeleteNotice(notice)
  }

  const handleConfirmDelete = async () => {
    if (
      numericProjectId === null ||
      !pendingDeleteNotice ||
      !canManageNotice(pendingDeleteNotice) ||
      deletingRef.current
    ) {
      return
    }

    deletingRef.current = true
    setIsDeleting(true)
    setDeleteError(undefined)
    try {
      await requestDeletePost(
        numericProjectId,
        pendingDeleteNotice.postId
      )
      setPendingDeleteNotice(undefined)
      deletingRef.current = false
      setIsDeleting(false)
      await loadNotices()
    } catch (requestError: unknown) {
      setDeleteError(
        requestError instanceof ApiError
          ? requestError.message
          : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      )
      deletingRef.current = false
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    if (deletingRef.current) return
    setPendingDeleteNotice(undefined)
    setDeleteError(undefined)
  }

  return (
    <Layout>
      <div className="sticky top-[env(safe-area-inset-top)] z-10 shrink-0 bg-gray-25">
        <TopNavBar title="공지" onBack={goToFeed} variant="projectContent" />
      </div>

      <main className="flex flex-1 flex-col bg-gray-25">
        {isLoading ? (
          <div
            className="flex flex-1 items-center justify-center"
            role="status"
            aria-label="공지 불러오는 중"
          >
            <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
          </div>
        ) : error ? (
          <EmptyState
            title="공지를 불러오지 못했어요"
            description={error}
            action={
              <Button
                type="button"
                fullWidth={false}
                onClick={() => void loadNotices()}
              >
                다시 시도
              </Button>
            }
          />
        ) : notices.length > 0 ? (
          <div className="space-y-4 px-5 py-6">
            {notices.map((notice) => (
              <NoticeHistoryItem
                key={notice.postId}
                notice={notice}
                isMenuOpen={openMenuPostId === notice.postId}
                canManage={canManageNotice(notice)}
                isDeleting={
                  isDeleting && pendingDeleteNotice?.postId === notice.postId
                }
                onToggleMenu={() =>
                  setOpenMenuPostId((current) =>
                    current === notice.postId ? null : notice.postId
                  )
                }
                onCloseMenu={() => setOpenMenuPostId(null)}
                onEdit={() => handleEdit(notice)}
                onDelete={() => handleDelete(notice)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="현재 등록된 공지가 없어요"
            description="새 공지가 등록되면 이 화면에서 확인할 수 있어요."
          />
        )}
      </main>

      <ConfirmDialog
        open={Boolean(pendingDeleteNotice)}
        variant="notice"
        title="공지를 삭제하시겠습니까?"
        description={
          deleteError ? (
            <span className="text-error">{deleteError}</span>
          ) : (
            '삭제된 공지는 복구할 수 없어요'
          )
        }
        confirmText={isDeleting ? '삭제 중' : '삭제하기'}
        cancelText="취소"
        destructive
        confirmDisabled={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </Layout>
  )
}
