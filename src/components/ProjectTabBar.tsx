import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
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
  return (
    <div className="flex flex-col min-h-svh">
      <TopNavBar
        title={project?.name ?? '프로젝트'}
        onBack={() => navigate('/home')}
        onSettingsClick={() => {
          if (projectId) navigate(`/project/${projectId}/settings`)
        }}
      />

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
