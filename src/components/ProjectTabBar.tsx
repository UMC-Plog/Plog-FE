import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { TopNavBar } from './TopNavBar'
import { useProjectStore } from '../store/projectStore'

// Figma 프로젝트 상세 상단 탭 기준: 피드 / 채팅 / 업무 / 리포트
const tabs = [
  { to: 'feed', label: '피드' },
  { to: 'chat', label: '채팅' },
  { to: 'tasks', label: '업무' },
  { to: 'report', label: '리포트' },
]

export default function ProjectTabBar() {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId)
  )
  const hasUnseenSettingsUpdate = useProjectStore((state) =>
    projectId
      ? Boolean(state.settingsUpdatesByProjectId[projectId]?.hasUnseenUpdate)
      : false
  )

  return (
    <div className="flex flex-col min-h-svh">
      <div className="relative">
        <TopNavBar
          title={project?.name ?? '프로젝트'}
          onBack={() => navigate('/home')}
          showSettings={false}
        />
        <button
          type="button"
          aria-label="프로젝트 설정"
          onClick={() => projectId && navigate(`/project/${projectId}/settings`)}
          className="absolute right-2 top-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-50"
        >
          <span className="relative inline-flex">
            <Settings className="h-5 w-5" aria-hidden />
            {hasUnseenSettingsUpdate && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-1 w-1 rounded-full bg-red-600"
              />
            )}
          </span>
        </button>
      </div>

      <nav className="border-b border-gray-200 bg-white">
        <ul className="flex">
          {tabs.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `relative flex h-10 items-center justify-center text-caption ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {tab.label}
                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
