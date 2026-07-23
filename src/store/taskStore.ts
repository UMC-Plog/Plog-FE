import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../types/task'

interface TaskState {
  tasks: Task[]
  createTask: (input: CreateTaskInput) => Task
  getTasksByProjectId: (projectId: string) => Task[]
  getTaskById: (projectId: string, taskId: string) => Task | undefined
  updateTask: (projectId: string, taskId: string, updates: UpdateTaskInput) => Task | undefined
  deleteTask: (projectId: string, taskId: string) => void
  updateTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      createTask: (input) => {
        const now = new Date().toISOString()
        const task: Task = {
          ...input,
          title: input.title.trim(),
          description: input.description?.trim(),
          attachmentCount: input.attachments.length,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({ tasks: [task, ...state.tasks] }))
        return task
      },

      getTasksByProjectId: (projectId) =>
        get().tasks.filter((task) => task.projectId === projectId),

      getTaskById: (projectId, taskId) =>
        get().tasks.find((task) => task.projectId === projectId && task.id === taskId),

      updateTask: (projectId, taskId, updates) => {
        let updatedTask: Task | undefined

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.projectId !== projectId || task.id !== taskId) return task
            updatedTask = {
              ...task,
              ...updates,
              title: updates.title.trim(),
              description: updates.description?.trim(),
              attachmentCount: updates.attachments.length,
              updatedAt: new Date().toISOString(),
            }
            return updatedTask
          }),
        }))
        return updatedTask
      },

      deleteTask: (projectId, taskId) =>
        set((state) => ({
          tasks: state.tasks.filter(
            (task) => task.projectId !== projectId || task.id !== taskId
          ),
        })),

      updateTaskStatus: (projectId, taskId, status) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.projectId === projectId &&
            task.id === taskId &&
            task.status !== status
              ? { ...task, status, updatedAt: new Date().toISOString() }
              : task
          ),
        })),
    }),
    {
      name: 'plog-task-storage',
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
)
