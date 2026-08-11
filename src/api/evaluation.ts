import { apiRequest } from './client'
import type { ProfilePreset } from '../lib/profilePreset'

export interface TargetMember {
  projectMemberId: number
  nickname: string
  isEvaluated: boolean
  profilePreset: ProfilePreset | null
}

export interface PeerEvaluationDetailResponse {
  peerId: number
  collaborationScore: number
  initiativeScore: number
  communicationScore: number
  outputScore: number
  keyword: string[]
  feedback: string
}

export interface PeerEvaluationCreateRequest {
  collaborationScore: number
  initiativeScore: number
  communicationScore: number
  outputScore: number
  keywords: string[]
  feedback: string
}

export interface PeerEvaluationCreateResponse {
  peerId: number
  isNudgeTriggered: boolean
}

export interface SelfFeedbackResponse {
  selfFeedbackId: number
  content: string
}

export interface SelfFeedbackUpdateResponse {
  selfFeedbackId: number
}

export interface EvaluationTargetResponse {
  /** 본인을 제외한 Peer 평가 대상 목록 */
  targets: TargetMember[]
  completedPeerEvaluationCount: number
  totalPeerEvaluationCount: number
  isSelfFeedbackCompleted: boolean
  /** 연동된 모든 외부 서비스에서 본인 계정 선택을 마쳤는지 */
  isAccountMappingCompleted: boolean
  /**
   * 서버 기준 최종 제출 가능 여부.
   * 자기 피드백 작성과 모든 연동 툴의 계정 선택까지 요구하는데, 팀에서 정한 정책은
   * 자기 피드백이 선택 사항이고 계정 선택도 전부 건너뛸 수 있다. 기준이 서로 달라
   * 제출 버튼 활성화에는 쓰지 않는다.
   */
  isFinalSubmissionAvailable: boolean
}

export function fetchEvaluationTargets(projectId: number) {
  return apiRequest<EvaluationTargetResponse>(`/api/projects/${projectId}/evaluations/targets`)
}

export function fetchPeerEvaluationDetail(projectId: number, targetMemberId: number) {
  return apiRequest<PeerEvaluationDetailResponse>(
    `/api/projects/${projectId}/evaluations/peers/${targetMemberId}`
  )
}

export function createPeerEvaluation(
  projectId: number,
  targetMemberId: number,
  body: PeerEvaluationCreateRequest
) {
  return apiRequest<PeerEvaluationCreateResponse>(
    `/api/projects/${projectId}/evaluations/peers/${targetMemberId}`,
    { method: 'POST', body }
  )
}

export function updatePeerEvaluation(
  projectId: number,
  targetMemberId: number,
  body: PeerEvaluationCreateRequest
) {
  return apiRequest<PeerEvaluationCreateResponse>(
    `/api/projects/${projectId}/evaluations/peers/${targetMemberId}`,
    { method: 'PUT', body }
  )
}

export function fetchMySelfFeedback(projectId: number) {
  return apiRequest<SelfFeedbackResponse>(`/api/projects/${projectId}/self-feedbacks/me`)
}

export function createSelfFeedback(projectId: number, content: string) {
  return apiRequest<SelfFeedbackResponse>(`/api/projects/${projectId}/self-feedbacks`, {
    method: 'POST',
    body: { content },
  })
}

export function updateSelfFeedback(projectId: number, content: string) {
  return apiRequest<SelfFeedbackUpdateResponse>(`/api/projects/${projectId}/self-feedbacks`, {
    method: 'PUT',
    body: { content },
  })
}
