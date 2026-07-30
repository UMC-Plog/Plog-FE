import { create } from "zustand";
import {
  createProject as requestCreateProject,
  getProjects,
  mapCreatedProjectResponse,
} from "../api/projectApi";
import { ApiError } from "../api/client";
import { useAuthStore } from "./authStore";
import type { CreateProjectRequest, CreatedProject, Project } from "../types/project";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  fetchProjects: (force?: boolean) => Promise<void>;
  createProject: (request: CreateProjectRequest) => Promise<CreatedProject>;
  reset: () => void;
}

let fetchPromise: Promise<void> | null = null;
let requestGeneration = 0;

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "네트워크 상태를 확인한 뒤 다시 시도해 주세요.";
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  hasFetched: false,
  error: null,
  fetchProjects: (force = false) => {
    if (fetchPromise && !force) return fetchPromise;

    const generation = force ? ++requestGeneration : requestGeneration;
    set({ isLoading: true, hasFetched: false, error: null });
    const currentPromise = getProjects()
      .then((projects) => {
        if (generation === requestGeneration) set({ projects, hasFetched: true });
      })
      .catch((error: unknown) => {
        if (generation === requestGeneration) set({ error: getErrorMessage(error) });
        throw error;
      })
      .finally(() => {
        if (fetchPromise === currentPromise) {
          set({ isLoading: false });
          fetchPromise = null;
        }
      });

    fetchPromise = currentPromise;
    return fetchPromise;
  },
  createProject: async (request) => {
    set({ error: null });
    try {
      const response = await requestCreateProject(request);
      const createdProject = mapCreatedProjectResponse(response);

      try {
        await get().fetchProjects(true);
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === createdProject.id
              ? {
                  ...project,
                  myProjectMemberId: createdProject.myProjectMemberId,
                }
              : project
          ),
        }));
      } catch {
        // 생성은 성공했으며, 다음 앱 화면 진입 시 공통 로더가 목록 조회를 재시도한다.
      }

      return createdProject;
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },
  reset: () => {
    requestGeneration += 1;
    fetchPromise = null;
    set({
      projects: [],
      isLoading: false,
      hasFetched: false,
      error: null,
    });
  },
}));

useAuthStore.subscribe((state, previousState) => {
  if (state.user?.id !== previousState.user?.id) {
    useProjectStore.getState().reset();
  }
});
