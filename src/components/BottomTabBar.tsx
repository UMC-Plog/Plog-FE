import { NavLink, Outlet } from 'react-router-dom'

// Figma 하단 탭바 기준: 프로젝트 / 리포트 / 채팅 / 마이
const tabs = [
  { to: '/', label: '프로젝트' },
  { to: '/report', label: '리포트' },
  { to: '/chat', label: '채팅' },
  { to: '/my', label: '마이' },
]

export default function BottomTabBar() {
  return (
    <div className="flex flex-col min-h-svh">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile border-t border-gray-200 bg-white">
        <ul className="flex justify-around py-2">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
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
    </div>
  )
}
