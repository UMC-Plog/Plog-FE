import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'

export function PeerEvaluationGuard() {
  const { id } = useParams<{ id: string }>()
  const projectStatus = useProjectStore(
    (state) => state.projects.find((project) => project.id === id)?.status
  )

  if (id && projectStatus === 'COMPLETED') {
    return <Navigate to={`/project/${id}/report`} replace />
  }

  return <Outlet />
}
