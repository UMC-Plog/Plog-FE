import { create } from "zustand";
import { initialProjects } from "../mocks/projects";
import type { Project } from "../types/project";

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (
    projectId: string,
    updates: Partial<Pick<Project, "name" | "type" | "expectedEndDate">>
  ) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [...initialProjects],
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),
  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, ...updates } : project
      ),
    })),
}));
