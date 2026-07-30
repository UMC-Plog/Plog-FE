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
    if (!state.hasFetched && !state.isLoading) {
      void fetchProjects(Boolean(state.error)).catch(() => undefined);
    }
  }, [accessToken, fetchProjects, location.pathname, reset]);

  return <Outlet />;
}
