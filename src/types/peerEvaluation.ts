export interface MemberEvaluation {
  scores: Record<string, number>
  keywords: string[]
  feedback: string
  done: boolean
}

export interface SelfFeedbackEntry {
  values: Record<string, string>
  done: boolean
}

export interface PeerEvaluationProjectState {
  evaluations: Record<string, MemberEvaluation>
  selfFeedback: SelfFeedbackEntry | null
  submitted: boolean
  submittedAt: string | null
}
