import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialProjects } from "../mocks/projects";
import type { Project } from "../types/project";

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [...initialProjects],
      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
        })),
    }),
    {
      name: "plog-project-storage",
      partialize: (state) => ({
        projects: state.projects,
      }),
    }
  )
);
