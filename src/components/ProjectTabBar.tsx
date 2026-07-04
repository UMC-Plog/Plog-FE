import { NavLink, Outlet } from 'react-router-dom'

// Figma 프로젝트 상세 상단 탭 기준: 피드 / 채팅 / 업무 / 리포트
const tabs = [
  { to: 'feed', label: '피드' },
  { to: 'chat', label: '채팅' },
  { to: 'tasks', label: '업무' },
  { to: 'report', label: '리포트' },
]

export default function ProjectTabBar() {
  return (
    <div className="flex flex-col min-h-svh">
      <nav className="border-b border-gray-200 bg-white">
        <ul className="flex justify-around py-2">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 text-caption px-3 py-1 ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`
                }
              >
                {tab.label}
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
