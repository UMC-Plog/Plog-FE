import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task } from '../types/task'

interface TaskState {
  tasks: Task[]
  getTasksByProjectId: (projectId: string) => Task[]
}

export const useTaskStore = create<TaskState>()(
  persist(
    (_set, get) => ({
      tasks: [],
      getTasksByProjectId: (projectId) =>
        get().tasks.filter((task) => task.projectId === projectId),
    }),
    {
      name: 'plog-task-storage',
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
)
