import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialProjects } from "../mocks/projects";
import type { Project } from "../types/project";

interface ProjectSettingsUpdate {
  hasUnseenUpdate: boolean;
  updatedAt: string;
  seenAt?: string;
}

interface ProjectState {
  projects: Project[];
  settingsUpdatesByProjectId: Record<string, ProjectSettingsUpdate>;
  addProject: (project: Project) => void;
  updateProject: (
    projectId: string,
    updates: Partial<Pick<Project, "name" | "type" | "expectedEndDate">>
  ) => void;
  markProjectSettingsUpdated: (projectId: string) => void;
  markProjectSettingsAsSeen: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [...initialProjects],
      settingsUpdatesByProjectId: {},
      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
        })),
      updateProject: (projectId, updates) =>
        set((state) => {
          const project = state.projects.find((item) => item.id === projectId);
          if (!project) return state;

          const normalizedUpdates = {
            ...updates,
            ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
          };
          const hasChanges = Object.entries(normalizedUpdates).some(
            ([key, value]) => project[key as keyof Project] !== value
          );
          if (!hasChanges) return state;

          const updatedAt = new Date().toISOString();
          return {
            projects: state.projects.map((item) =>
              item.id === projectId ? { ...item, ...normalizedUpdates } : item
            ),
            settingsUpdatesByProjectId: {
              ...state.settingsUpdatesByProjectId,
              [projectId]: {
                hasUnseenUpdate: true,
                updatedAt,
              },
            },
          };
        }),
      markProjectSettingsUpdated: (projectId) =>
        set((state) => {
          if (!state.projects.some((project) => project.id === projectId)) return state;
          return {
            settingsUpdatesByProjectId: {
              ...state.settingsUpdatesByProjectId,
              [projectId]: {
                hasUnseenUpdate: true,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),
      markProjectSettingsAsSeen: (projectId) =>
        set((state) => {
          if (!state.projects.some((project) => project.id === projectId)) return state;
          const currentUpdate = state.settingsUpdatesByProjectId[projectId];
          if (!currentUpdate?.hasUnseenUpdate) return state;

          return {
            settingsUpdatesByProjectId: {
              ...state.settingsUpdatesByProjectId,
              [projectId]: {
                ...currentUpdate,
                hasUnseenUpdate: false,
                seenAt: new Date().toISOString(),
              },
            },
          };
        }),
    }),
    {
      name: "plog-project-storage",
      partialize: (state) => ({
        projects: state.projects,
        settingsUpdatesByProjectId: state.settingsUpdatesByProjectId,
      }),
    }
  )
);
