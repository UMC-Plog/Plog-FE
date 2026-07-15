import { FileText, Folder, MessageSquare, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/home", label: "프로젝트", icon: Folder },
  { to: "/report", label: "리포트", icon: FileText },
  { to: "/chat", label: "채팅", icon: MessageSquare },
  { to: "/my", label: "마이", icon: UserRound },
];

export default function BottomTabBar() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-mobile -translate-x-1/2 border-t border-gray-200 bg-white">
        <ul className="grid h-20 grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.to === "/home"}
                  className={({ isActive }) =>
                    `flex h-full flex-col items-center justify-center gap-1 text-caption font-normal transition-colors ${
                      isActive ? "text-blue-500" : "text-gray-400"
                    }`
                  }
                >
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                  {tab.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
