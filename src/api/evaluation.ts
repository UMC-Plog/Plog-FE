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
  /** 서버 기준 현재 사용자의 최종 제출 가능 여부 */
  isFinalSubmissionAvailable: boolean
  /** 현재 사용자가 최종 제출을 마쳤는지 */
  isCurrentMemberFinalSubmitted: boolean
  /** 최종 제출을 완료한 프로젝트 멤버 수 */
  completedFinalSubmissionCount: number
  /** 최종 제출 대상 프로젝트 멤버 수 */
  totalFinalSubmissionCount: number
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
