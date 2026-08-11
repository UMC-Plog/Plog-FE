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
  updateProject: (projectId: string, changes: Partial<Pick<Project, "expectedEndDate" | "name" | "type">>) => void;
  createProject: (request: CreateProjectRequest) => Promise<CreatedProject>;
  removeProject: (projectId: string) => void;
  reset: () => void;
}

let fetchPromise: Promise<void> | null = null;
let requestGeneration = 0;
type ProjectChanges = Partial<Pick<Project, "expectedEndDate" | "name" | "type">>;
const pendingProjectChanges = new Map<string, ProjectChanges>();

function mergePendingProjectChanges(projects: Project[]) {
  return projects.map((project) => {
    const changes = pendingProjectChanges.get(project.id);
    if (!changes) return project;

    const hasReachedServer = Object.entries(changes).every(
      ([key, value]) => project[key as keyof ProjectChanges] === value
    );
    if (hasReachedServer) {
      pendingProjectChanges.delete(project.id);
      return project;
    }

    return { ...project, ...changes };
  });
}

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
        if (generation === requestGeneration) {
          set({ projects: mergePendingProjectChanges(projects), hasFetched: true });
        }
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
  updateProject: (projectId, changes) => {
    pendingProjectChanges.set(projectId, {
      ...pendingProjectChanges.get(projectId),
      ...changes,
    });
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, ...changes } : project
      ),
    }));
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
  // 나가기 성공 직후 목록 조회가 실패해도 나간 프로젝트가 남아 보이지 않도록 로컬에서 먼저 제거한다.
  removeProject: (projectId) => {
    pendingProjectChanges.delete(projectId);
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
    }));
  },
  reset: () => {
    requestGeneration += 1;
    fetchPromise = null;
    pendingProjectChanges.clear();
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
