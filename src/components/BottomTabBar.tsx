import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useNotificationBadgeStore } from "../store/notificationBadgeStore";
import { cn } from "../lib/utils";
import { NotificationDot } from "./NotificationDot";

function FolderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7C3 6.46957 3.21071 5.96086 3.58579 5.58579C3.96086 5.21071 4.46957 5 5 5H8.5L10.3 7H19C19.5304 7 20.0391 7.21071 20.4142 7.58579C20.7893 7.96086 21 8.46957 21 9V17C21 17.5304 20.7893 18.0391 20.4142 18.4142C20.0391 18.7893 19.5304 19 19 19H5C4.46957 19 3.96086 18.7893 3.58579 18.4142C3.21071 18.0391 3 17.5304 3 17V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.5 3H7.5C6.11929 3 5 4.11929 5 5.5V18.5C5 19.8807 6.11929 21 7.5 21H16.5C17.8807 21 19 19.8807 19 18.5V5.5C19 4.11929 17.8807 3 16.5 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 8H15M9 12H15M9 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5H20C20.2652 5 20.5196 5.10536 20.7071 5.29289C20.8946 5.48043 21 5.73478 21 6V15C21 15.2652 20.8946 15.5196 20.7071 15.7071C20.5196 15.8946 20.2652 16 20 16H9L5 20V16H4C3.73478 16 3.48043 15.8946 3.29289 15.7071C3.10536 15.5196 3 15.2652 3 15V6C3 5.73478 3.10536 5.48043 3.29289 5.29289C3.48043 5.10536 3.73478 5 4 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11.4C13.8778 11.4 15.4 9.87777 15.4 8C15.4 6.12223 13.8778 4.6 12 4.6C10.1222 4.6 8.6 6.12223 8.6 8C8.6 9.87777 10.1222 11.4 12 11.4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M5.5 20C5.5 16.4 8.4 14 12 14C15.6 14 18.5 16.4 18.5 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const tabs = [
  { to: "/home", label: "프로젝트", Icon: FolderIcon },
  { to: "/report", label: "리포트", Icon: ReportIcon },
  { to: "/chat", label: "채팅", Icon: ChatIcon },
  { to: "/my", label: "마이", Icon: MyIcon },
];

export default function BottomTabBar() {
  const location = useLocation();
  const hasUnreadChat = useNotificationBadgeStore((state) => state.hasUnreadChat);
  const refreshBadges = useNotificationBadgeStore((state) => state.refresh);
  const usesFixedViewport = location.pathname === "/home" || location.pathname === "/my";

  const isFirstRender = useRef(true);

  useEffect(() => {
    // 최초 진입 시에는 경로와 무관하게 한 번 갱신하고, 이후로는 홈/채팅 탭으로
    // 이동할 때만 갱신한다 (합치지 않으면 첫 진입 경로가 /home일 때 두 번 호출됨).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void refreshBadges();
      return;
    }

    if (location.pathname === "/home" || location.pathname === "/chat") {
      void refreshBadges();
    }
  }, [location.pathname, refreshBadges]);

  useEffect(() => {
    const onPush = () => void refreshBadges();
    window.addEventListener("plog:notification-received", onPush);
    return () => window.removeEventListener("plog:notification-received", onPush);
  }, [refreshBadges]);

  return (
    <div
      className={cn(
        "flex flex-col bg-gray-25",
        usesFixedViewport
          ? "h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden"
          : "min-h-[calc(100dvh-env(safe-area-inset-top))]"
      )}
    >
      <main
        className={cn(
          "flex-1 bg-gray-25 pb-[calc(66px+max(22px,env(safe-area-inset-bottom)))]",
          usesFixedViewport && "min-h-0 overflow-hidden"
        )}
      >
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-mobile -translate-x-1/2 border-t border-gray-100 bg-white pb-[max(22px,env(safe-area-inset-bottom))] pt-[11px]">
        <ul className="grid grid-cols-4">
          {tabs.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/home"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-[5px] text-caption font-normal transition-colors ${
                    isActive ? "text-primary" : "text-gray-400"
                  }`
                }
              >
                <span className="relative inline-flex">
                  <Icon />
                  <NotificationDot
                    show={to === "/chat" && hasUnreadChat}
                    className="top-[-6px] right-[-6px] h-[11px] w-[11px]"
                  />
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
