import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef } from 'react'
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
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isChatRoute) return

    const shell = shellRef.current
    const viewport = window.visualViewport
    if (!shell || !viewport) return

    const root = document.getElementById('root')
    const initialShellTop = shell.getBoundingClientRect().top
    const initialViewportTop = viewport.offsetTop
    // standalone PWA에서 #root가 확보한 상단 safe area는 fixed 요소에도 직접 반영한다.
    const safeTop = Math.max(0, initialShellTop - initialViewportTop)
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const htmlOverflow = document.documentElement.style.overflow
    const htmlOverscroll = document.documentElement.style.overscrollBehavior
    const bodyOverflow = document.body.style.overflow
    const bodyOverscroll = document.body.style.overscrollBehavior
    let frameId: number | null = null

    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'

    // iOS는 키보드가 input을 가리면 layout viewport 자체를 위로 이동시킨다. 채팅 내부만
    // 줄이면 헤더/탭은 이미 화면 밖에 있으므로, 전체 프로젝트 채팅 셸을 visual viewport에 고정한다.
    shell.style.position = 'fixed'
    shell.style.zIndex = '20'

    const syncViewport = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        frameId = null
        const rootRect = root?.getBoundingClientRect()
        shell.style.left = `${Math.round(rootRect?.left ?? 0)}px`
        shell.style.width = `${Math.round(rootRect?.width ?? window.innerWidth)}px`
        shell.style.top = `${Math.round(viewport.offsetTop + safeTop)}px`
        shell.style.height = `${Math.max(1, Math.floor(viewport.height - safeTop))}px`
      })
    }

    syncViewport()
    viewport.addEventListener('resize', syncViewport)
    viewport.addEventListener('scroll', syncViewport)
    window.addEventListener('orientationchange', syncViewport)

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      viewport.removeEventListener('resize', syncViewport)
      viewport.removeEventListener('scroll', syncViewport)
      window.removeEventListener('orientationchange', syncViewport)
      shell.style.removeProperty('position')
      shell.style.removeProperty('z-index')
      shell.style.removeProperty('left')
      shell.style.removeProperty('width')
      shell.style.removeProperty('top')
      shell.style.removeProperty('height')
      document.documentElement.style.overflow = htmlOverflow
      document.documentElement.style.overscrollBehavior = htmlOverscroll
      document.body.style.overflow = bodyOverflow
      document.body.style.overscrollBehavior = bodyOverscroll
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
    }
  }, [isChatRoute])

  return (
    <div
      ref={shellRef}
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
