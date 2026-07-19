import { create } from "zustand";
import { initialProjects } from "../mocks/projects";
import type { Project } from "../types/project";

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [...initialProjects],
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),
}));
