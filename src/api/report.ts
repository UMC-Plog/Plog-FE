import { apiRequest } from './client'
import type { ProfilePreset } from '../types/project'

export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED'

/** 분석 신뢰도 등급. 근거가 적을수록 낮아지며 '분석 제한' 안내와 함께 쓰인다 */
export type ReliabilityTier = 'P0' | 'P1' | 'P2' | 'P3'

export type CompetencyKey = 'COLLABORATION' | 'LEADERSHIP' | 'COMMUNICATION' | 'OUTPUT'

/** 역량별 점수. 근거가 없으면 빈 객체로 온다 */
export type CompetencyScores = Partial<Record<CompetencyKey, number>>

export interface ReportMemberSummaryResponse {
  projectMemberId: number
  memberName: string
  /** 아직 계산 전이면 null */
  finalScore: number | null
  /** 팀 내 기여율. 계산 불가하면 null */
  contributionRate: number | null
  reliabilityTier: ReliabilityTier
  /** AI 한줄 평가. 생성 실패 시 null */
  headline: string | null
  profilePreset: ProfilePreset | null
  totalTaskCount: number
  completedTaskCount: number
  deadlineMetTaskCount: number
  deadlineTargetTaskCount: number
  /** 0~100. 업무가 없으면 null */
  completionRate: number | null
  /** 0~100. 마감 대상 업무가 없으면 null */
  deadlineComplianceRate: number | null
  /** 5점 척도. 받은 평가가 없으면 null */
  peerAverage: number | null
  peerCompetencyScores: CompetencyScores
  peerKeywords: string[]
}

export interface ReportDetailResponse {
  reportId: number
  reportCode: string
  projectId: number
  projectName: string
  status: ReportStatus
  /** 발행 전이면 null */
  completedAt: string | null
  pdfAvailable: boolean
  /** 팀 AI 인사이트. 생성 실패 시 null */
  teamStrength: string | null
  teamSuggestion: string | null
  teamCompletionRate: number
  teamDeadlineComplianceRate: number
  /** 발행 전(GENERATING/FAILED)에는 항상 빈 배열 */
  members: ReportMemberSummaryResponse[]
  projectStartDate: string
  projectEndDate: string
  memberCount: number
  totalTaskCount: number
  completedTaskCount: number
  deadlineMetTaskCount: number
  deadlineTargetTaskCount: number
}

export interface StrengthCard {
  title: string
  description: string
}

export interface ReportWeakness {
  title: string
  suggestions: string[]
}

export interface ReportGrowthInsight {
  growthPoint: string
  keepStrength: string
  nextAction: string
}

export interface ReportWritingSuggestion {
  coverLetter: string
  portfolio: string
}

export interface ReportMemberResultResponse {
  reportId: number
  projectMemberId: number
  memberName: string
  internalScore: number | null
  /** 계정 매핑이 없거나 점수화 가능한 활동이 없으면 null */
  externalScore: number | null
  peerScore: number | null
  peerAverage: number | null
  /** 팀원 1명·동점·근거 부족이면 null */
  peerZScore: number | null
  peerPercentile: number | null
  peerCompetencyScores: CompetencyScores
  peerKeywords: string[]
  selfFeedbackScore: number | null
  finalScore: number | null
  contributionRate: number | null
  externalToolConnected: boolean
  reliabilityTier: ReliabilityTier
  /** 분석 한계 안내 문구('분석 제한'). 없으면 null */
  cautionText: string | null
  totalTaskCount: number
  completedTaskCount: number
  deadlineMetTaskCount: number
  deadlineTargetTaskCount: number
  completionRate: number | null
  deadlineComplianceRate: number | null
  collaborationStability: number | null
  vulnerability: number | null
  vulnerableCompetency: CompetencyKey | null
  headline: string | null
  /** 근거 부족 시 빈 배열 */
  strengths: StrengthCard[]
  weakness: ReportWeakness | null
  growth: ReportGrowthInsight | null
  writing: ReportWritingSuggestion | null
  reportCode: string
  projectName: string
  completedAt: string | null
  projectStartDate: string
  projectEndDate: string
  /** 개인 그래프용 0~100 환산 점수 */
  competencyScores100: CompetencyScores
}

export interface ReportSearchResponse {
  projectId: number
  projectName: string
  reportId: number
  reportStatus: ReportStatus
  completedAt: string | null
}

interface SliceResponse<T> {
  content: T[]
  page: number
  size: number
  hasNext: boolean
}

export interface ReportPdfDownloadResponse {
  reportId: number
  fileName: string
  downloadUrl: string
  expiresInSeconds: number
}

export function fetchReports(params: { page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  const qs = query.toString()
  return apiRequest<SliceResponse<ReportSearchResponse>>(`/api/dashboard/reports${qs ? `?${qs}` : ''}`)
}

export function searchReports(params: { keyword?: string; startDate?: string; endDate?: string; page?: number; size?: number } = {}) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  return apiRequest<SliceResponse<ReportSearchResponse>>(`/api/dashboard/reports/search?${query.toString()}`)
}

export function fetchReportPdfDownloadUrl(reportId: number) {
  return apiRequest<ReportPdfDownloadResponse>(`/api/dashboard/reports/${reportId}/pdf`)
}

/**
 * 발행 전(GENERATING/FAILED)에도 404가 아니라 200으로 상태를 내려준다.
 * 프론트는 status로 "생성 중" 화면을 그리고 폴링한다. 이때 members는 항상 빈 배열이다.
 */
export function fetchReportDetail(reportId: number) {
  return apiRequest<ReportDetailResponse>(`/api/dashboard/reports/${reportId}`)
}

export function fetchReportMemberResult(reportId: number, projectMemberId: number) {
  return apiRequest<ReportMemberResultResponse>(
    `/api/dashboard/reports/${reportId}/members/${projectMemberId}/result`
  )
}
