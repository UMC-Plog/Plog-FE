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
  // 마감일+7일 경과 후 미제출자가 있는 채로 자동 발행된 경우 true
  partial: boolean
}
