import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { TopNavBar } from './TopNavBar'
import { useProjectStore } from '../store/projectStore'
import { cn } from '../lib/utils'

// Figma 프로젝트 상세 상단 탭 기준: 피드 / 채팅 / 업무 / 리포트
const tabs = [
  { to: 'feed', label: '피드' },
  { to: 'chat', label: '채팅' },
  { to: 'tasks', label: '업무' },
  { to: 'report', label: '리포트' },
]

export default function ProjectTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId)
  )
  const isChatRoute = location.pathname.endsWith('/chat')

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-25',
        isChatRoute
          ? 'h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden'
          : 'min-h-svh'
      )}
    >
      <div className="sticky top-[env(safe-area-inset-top)] z-10 shrink-0 bg-gray-25">
        <TopNavBar
          title={project?.name ?? '프로젝트'}
          onBack={() => navigate('/home')}
          variant="projectContent"
          onNotificationClick={() => navigate('/notifications')}
          onSettingsClick={() => {
            if (projectId) navigate(`/project/${projectId}/settings`)
          }}
        />

        <nav className="shrink-0 border-b border-gray-200 bg-white">
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
      </div>

      <main className={cn('flex-1', isChatRoute && 'min-h-0 overflow-hidden')}>
        <Outlet />
      </main>
    </div>
  )
}
