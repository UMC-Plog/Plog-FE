import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useProjectStore } from "../store/projectStore";

export function ProjectDataLoader() {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const reset = useProjectStore((state) => state.reset);

  useEffect(() => {
    if (!accessToken) {
      reset();
      return;
    }

    const state = useProjectStore.getState();
    if (state.isLoading) return;

    // 다른 팀원이 변경한 프로젝트 설정도 홈에 다시 들어오는 즉시 반영한다.
    if (location.pathname === "/home") {
      void fetchProjects(true).catch(() => undefined);
    } else if (!state.hasFetched) {
      void fetchProjects(Boolean(state.error)).catch(() => undefined);
    }
  }, [accessToken, fetchProjects, location.pathname, reset]);

  useEffect(() => {
    if (!accessToken || location.pathname !== "/home") return;

    const refreshProjects = () => {
      const state = useProjectStore.getState();
      if (!state.isLoading) {
        void fetchProjects(true).catch(() => undefined);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshProjects();
    };

    window.addEventListener("focus", refreshProjects);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshProjects();
    }, 30_000);
    return () => {
      window.removeEventListener("focus", refreshProjects);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, [accessToken, fetchProjects, location.pathname]);

  return <Outlet />;
}
