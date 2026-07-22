import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PeerEvaluationProjectState } from '../types/peerEvaluation'

const emptyProjectState: PeerEvaluationProjectState = {
  evaluations: {},
  selfFeedback: null,
  submitted: false,
  submittedAt: null,
}

interface PeerEvaluationState {
  byProject: Record<string, PeerEvaluationProjectState>
  getProjectState: (projectId: string) => PeerEvaluationProjectState
  saveMemberScores: (projectId: string, memberId: string, scores: Record<string, number>) => void
  completeMemberEvaluation: (
    projectId: string,
    memberId: string,
    keywords: string[],
    feedback: string
  ) => void
  completeSelfFeedback: (projectId: string, values: Record<string, string>) => void
  submitFinal: (projectId: string) => void
}

export const usePeerEvaluationStore = create<PeerEvaluationState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getProjectState: (projectId) => get().byProject[projectId] ?? emptyProjectState,

      saveMemberScores: (projectId, memberId, scores) =>
        set((state) => {
          const project = state.byProject[projectId] ?? emptyProjectState
          const existing = project.evaluations[memberId]
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...project,
                evaluations: {
                  ...project.evaluations,
                  [memberId]: {
                    scores,
                    keywords: existing?.keywords ?? [],
                    feedback: existing?.feedback ?? '',
                    done: existing?.done ?? false,
                  },
                },
              },
            },
          }
        }),

      completeMemberEvaluation: (projectId, memberId, keywords, feedback) =>
        set((state) => {
          const project = state.byProject[projectId] ?? emptyProjectState
          const existing = project.evaluations[memberId]
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...project,
                evaluations: {
                  ...project.evaluations,
                  [memberId]: {
                    scores: existing?.scores ?? {},
                    keywords,
                    feedback,
                    done: true,
                  },
                },
              },
            },
          }
        }),

      completeSelfFeedback: (projectId, values) =>
        set((state) => {
          const project = state.byProject[projectId] ?? emptyProjectState
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...project,
                selfFeedback: { values, done: true },
              },
            },
          }
        }),

      submitFinal: (projectId) =>
        set((state) => {
          const project = state.byProject[projectId] ?? emptyProjectState
          return {
            byProject: {
              ...state.byProject,
              [projectId]: {
                ...project,
                submitted: true,
                submittedAt: new Date().toISOString(),
              },
            },
          }
        }),
    }),
    {
      name: 'plog-peer-evaluation',
      partialize: (state) => ({ byProject: state.byProject }),
    }
  )
)
