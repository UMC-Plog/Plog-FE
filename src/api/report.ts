import { apiRequest } from './client'

export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED'

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
