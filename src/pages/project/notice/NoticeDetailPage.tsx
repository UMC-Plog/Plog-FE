import { Navigate, useParams } from 'react-router-dom'

export default function NoticeDetailPage() {
  const { id: projectId } = useParams<{ id: string }>()

  return (
    <Navigate
      to={projectId ? `/project/${projectId}/notices` : '/home'}
      replace
    />
  )
}
