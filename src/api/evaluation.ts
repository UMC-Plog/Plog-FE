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

export function fetchEvaluationTargets(projectId: number) {
  return apiRequest<{ targets: TargetMember[] }>(`/api/projects/${projectId}/evaluations/targets`)
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
