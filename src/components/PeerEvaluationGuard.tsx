import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { getProjectSettings } from '../api/projectApi'
import { useProjectStore } from '../store/projectStore'
import type { ProjectStatus } from '../types/project'

export function PeerEvaluationGuard() {
  const { id } = useParams<{ id: string }>()
  const cachedProjectStatus = useProjectStore(
    (state) => state.projects.find((project) => project.id === id)?.status
  )
  const [verified, setVerified] = useState<{
    projectId: string | null
    status: ProjectStatus | null
  }>({ projectId: null, status: null })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setVerified({ projectId: null, status: null })

    void getProjectSettings(id)
      .then((settings) => {
        if (!cancelled) setVerified({ projectId: id, status: settings.status })
      })
      .catch(() => {
        if (!cancelled) {
          const latestCachedStatus = useProjectStore
            .getState()
            .projects.find((project) => project.id === id)?.status
          setVerified({ projectId: id, status: latestCachedStatus ?? null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (id && cachedProjectStatus === 'COMPLETED') {
    return <Navigate to={`/project/${id}/report`} replace />
  }

  // 캐시가 IN_PROGRESS여도 서버는 이미 완료됐을 수 있으므로 최신 상태 확인 전에는
  // 하위 평가 화면을 렌더링하지 않는다.
  if (!id) return null

  if (verified.projectId !== id) {
    return (
      <div className="flex h-[calc(100dvh-env(safe-area-inset-top))] items-center justify-center bg-gray-25">
        <span
          className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500"
          role="status"
          aria-label="프로젝트 상태 확인 중"
        />
      </div>
    )
  }

  if (verified.status === 'COMPLETED') {
    return <Navigate to={`/project/${id}/report`} replace />
  }

  return <Outlet />
}
