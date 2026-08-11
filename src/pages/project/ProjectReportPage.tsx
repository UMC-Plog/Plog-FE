import { Check, Crown, Info } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertModal } from '../../components/Modal'
import { cn } from '../../lib/utils'
import { getProjectDeadline, isFutureDate } from '../../lib/projectDate'
import { useProjectStore } from '../../store/projectStore'
import { syncProjectStatus } from '../../api/projectApi'
import { fetchEvaluationTargets } from '../../api/evaluation'
import { fetchReportDetail, searchReports, type ReportStatus } from '../../api/report'

// 생성은 멤버 수만큼 LLM을 호출해 수십 초가 걸린다. 초반엔 자주 확인하고 길어지면 간격을 늘린다.
const POLL_START_MS = 3000
const POLL_MAX_MS = 15000
// 상한은 끝나지 않은 생성이 방치되는 것을 막는 안전장치다. 화면을 벗어나면 어차피 멈춘다.
const POLL_TIMEOUT_MS = 10 * 60 * 1000
// 개인 리포트는 상세 화면 안에서 함께 제공하므로 프로젝트 리포트 목록에서는 숨긴다.
// 정책이 바뀌면 카드 구현을 복구할 수 있도록 UI 코드는 유지한다.
const SHOW_PERSONAL_REPORT_CARD = false

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Figma의 radius/shadow 값(12/16/18/22/11px)이 기존 디자인 토큰(sm6/md10/lg14/xl20)과
// 맞지 않아 이 화면만 임의값으로 정확히 맞춤 — 팀 논의 후 토큰 확장 필요
type EvaluationStatus = 'locked' | 'unlocked' | 'submitted'

interface ReportItem {
  id: string
  tier: 'basic' | 'premium'
  title: string
  createdAt: string
  locked?: boolean
}

const formatReportDate = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export default function ProjectReportPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId)
  )

  const [reportId, setReportId] = useState<number | null>(null)
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [isTimeoutApplied, setIsTimeoutApplied] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [reportLoadFailed, setReportLoadFailed] = useState(false)
  const [evaluationCompleted, setEvaluationCompleted] = useState(false)
  const [evaluationLoadedProjectId, setEvaluationLoadedProjectId] = useState<string | null>(null)
  const [evaluationLoadFailed, setEvaluationLoadFailed] = useState(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const applyReport = useCallback(
    (next: { reportId: number | null; status: ReportStatus | null; completedAt?: string | null }) => {
      setReportId(next.reportId)
      setReportStatus(next.status)
      if (next.completedAt !== undefined) setCompletedAt(next.completedAt)
    },
    []
  )

  // 리포트는 프로젝트가 완료로 전환될 때 만들어지고, 그 전환을 확인해주는 게 이 API다.
  // 전원 제출을 마지막 사람이 끝냈어도 아무도 호출하지 않으면 계속 IN_PROGRESS로 남아
  // 리포트가 생기지 않으므로, 리포트 화면에 들어올 때마다 확인한다.
  // 조건 미충족이면 에러가 아니라 현재 상태가 오므로 매번 불러도 안전하다.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setReportLoadFailed(false)

    const loadReport = async () => {
      try {
        const res = await syncProjectStatus(projectId)
        if (cancelled) return
        setIsTimeoutApplied(res.isTimeoutApplied)
        applyReport({ reportId: res.reportId, status: res.reportStatus })

        // 상태 동기화 응답에는 완료 시각이 없으므로 완료된 리포트의 상세를 한 번 더 조회한다.
        // 생성 중인 리포트는 아래 폴링 effect에서 완료 시각까지 반영한다.
        if (res.reportStatus === 'COMPLETED' && res.reportId !== null) {
          const detail = await fetchReportDetail(res.reportId).catch(() => null)
          if (cancelled || !detail) return
          applyReport({
            reportId: res.reportId,
            status: detail.status,
            completedAt: detail.completedAt,
          })
        }
      } catch {
        // 상태 전환에 실패해도 이미 발행된 리포트는 보여줄 수 있어야 한다.
        if (cancelled) return
        const numericProjectId = Number(projectId)
        const fallback = await searchReports({ size: 100 }).catch(() => null)
        if (cancelled) return
        if (!fallback) {
          setReportLoadFailed(true)
          return
        }
        const found = fallback?.content.find((item) => item.projectId === numericProjectId)
        applyReport({
          reportId: found?.reportId ?? null,
          status: found?.reportStatus ?? null,
          completedAt: found?.completedAt ?? null,
        })
      } finally {
        if (!cancelled) setLoadedProjectId(projectId)
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [projectId, applyReport])

  // 리포트 생성 여부와 현재 사용자의 평가 제출 여부는 별개다. 다른 팀원이 아직 제출하지 않아
  // 리포트가 없어도, 내 평가를 모두 마쳤다면 새로고침 후에도 완료 상태를 유지한다.
  useEffect(() => {
    const numericProjectId = Number(projectId)
    if (!projectId || !Number.isFinite(numericProjectId)) return
    let cancelled = false
    setEvaluationLoadFailed(false)

    void fetchEvaluationTargets(numericProjectId)
      .then((res) => {
        if (cancelled) return
        setEvaluationCompleted(
          res.targets.length > 0 && res.targets.every((target) => target.isEvaluated)
        )
      })
      .catch(() => {
        if (!cancelled) setEvaluationLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setEvaluationLoadedProjectId(projectId)
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  // 생성은 멤버 수만큼 LLM을 호출해 수십 초가 걸린다. 끝날 때까지 상세를 폴링한다.
  useEffect(() => {
    if (reportId === null || reportStatus !== 'GENERATING') return
    let cancelled = false

    const run = async () => {
      const startedAt = Date.now()
      let delay = POLL_START_MS
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await sleep(delay)
        if (cancelled || !activeRef.current) return

        const detail = await fetchReportDetail(reportId).catch(() => null)
        if (cancelled || !activeRef.current) return

        if (detail && detail.status !== 'GENERATING') {
          applyReport({ reportId, status: detail.status, completedAt: detail.completedAt })
          return
        }
        delay = Math.min(Math.round(delay * 1.5), POLL_MAX_MS)
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [reportId, reportStatus, applyReport])

  const status: EvaluationStatus =
    reportStatus !== null || evaluationCompleted
      ? 'submitted'
      : project && !isFutureDate(project.expectedEndDate)
      ? 'unlocked'
      : 'locked'

  const [showSubmittedModal, setShowSubmittedModal] = useState(false)

  // Peer 평가 목록에서 "최종 제출하기"로 막 넘어온 경우에만 안내를 한 번 띄운다.
  useEffect(() => {
    if ((location.state as { justSubmitted?: boolean } | null)?.justSubmitted) {
      setShowSubmittedModal(true)
      navigate('.', { replace: true, state: null })
    }
  }, [location.state, navigate])

  const deadline = project ? getProjectDeadline(project) : null

  const handleStartEvaluation = () => {
    if (status !== 'unlocked' || !projectId) return
    navigate(`/project/${projectId}/peer-eval`)
  }

  const submittedAt = formatReportDate(completedAt)
  const isReportLoading =
    loadedProjectId !== projectId || evaluationLoadedProjectId !== projectId
  const pageLoadFailed = reportLoadFailed || (reportStatus === null && evaluationLoadFailed)
  const reportGenerating = reportStatus === 'GENERATING'
  const reportFailed = reportStatus === 'FAILED'
  const reports: ReportItem[] =
    reportStatus === 'COMPLETED' && reportId !== null
      ? [
          { id: String(reportId), tier: 'basic', title: `${project?.name ?? '프로젝트'} 기여도 분석 리포트`, createdAt: submittedAt },
          ...(SHOW_PERSONAL_REPORT_CARD
            ? [{ id: 'premium', tier: 'premium' as const, title: '개인 기여도 리포트', createdAt: submittedAt, locked: true }]
            : []),
        ]
      : []
  const hasReports = reports.length > 0

  return (
    <div className="min-h-[calc(100svh-theme(spacing.12)-theme(spacing.10))] bg-gray-25 px-[21px] pt-[22px] pb-6">
      {isReportLoading ? (
        <div className="mt-[72px] flex flex-col items-center gap-4" role="status">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
          <p className="text-body-sm font-medium text-gray-400">리포트를 불러오고 있어요</p>
        </div>
      ) : pageLoadFailed ? (
        <div className="mt-[72px] flex flex-col items-center gap-4" role="alert">
          <p className="text-title font-medium text-gray-500">리포트를 불러오지 못했어요</p>
          <p className="text-body-sm text-gray-400">잠시 후 다시 확인해 주세요</p>
        </div>
      ) : status === 'locked' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5 rounded-18 bg-gray-50 px-5 py-[22px]">
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-body-sm font-semibold text-gray-400">Peer 평가를 시작하세요</p>
              <p className="text-caption font-medium text-gray-400">
                AI 리포트 생성을 위해 평가가 필요해요
              </p>
            </div>
            <div className="flex h-[46px] shrink-0 items-center rounded-12 bg-gray-100 px-[18px]">
              <span className="text-title font-bold text-gray-400">평가 시작</span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-12 bg-primary-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden />
            <p className="text-caption font-medium text-primary-500">
              프로젝트 마감일부터 Peer 평가를 시작할 수 있어요
            </p>
          </div>
        </div>
      ) : null}

      {!isReportLoading && !pageLoadFailed && status === 'unlocked' && (
        <button
          type="button"
          aria-label="Peer 평가 시작"
          onClick={handleStartEvaluation}
          className="flex w-full items-center gap-3.5 rounded-18 bg-gradient-to-r from-primary-500 to-aqua-500 px-5 py-[22px] text-left shadow-cta"
        >
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="text-body-sm font-bold tracking-[-0.4px] text-gray-25">
                Peer 평가를 시작하세요
              </p>
              {deadline && (
                <span className="flex h-[18px] w-10 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-navy-700">
                  {deadline.label}
                </span>
              )}
            </div>
            <p className="text-caption font-medium text-gray-25">
              AI 리포트 생성을 위해 평가가 필요해요
            </p>
          </div>
          <span className="flex h-[46px] shrink-0 items-center rounded-12 bg-gray-25 px-[18px] text-title font-bold text-navy-700">
            평가 시작
          </span>
        </button>
      )}

      {!isReportLoading &&
        !pageLoadFailed &&
        status === 'submitted' &&
        (!hasReports || showSubmittedModal) && (
          <div className="flex w-full items-center gap-3.5 rounded-18 bg-gradient-to-r from-primary-500 to-aqua-500 px-5 py-[22px] shadow-cta">
            <p className="flex-1 text-body-sm font-bold tracking-[-0.4px] text-gray-25">
              Peer 평가 제출이 완료되었습니다
            </p>
            <span className="flex h-[46px] shrink-0 items-center rounded-12 bg-gray-25 px-[18px] text-title font-bold text-navy-700">
              평가 완료
            </span>
          </div>
        )}

      {/* 종료일 7일 경과로 일부 미제출 상태에서 발행된 경우, 데이터가 완전하지 않다는 것을 알려야 한다 */}
      {!isReportLoading && !pageLoadFailed && hasReports && isTimeoutApplied && (
        <div className="mt-3 flex items-start gap-2 rounded-12 bg-primary-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden />
          <p className="text-caption font-medium text-primary-500">
            일부 팀원이 평가를 제출하지 않아, 제출된 평가와 수집된 활동을 기준으로 발행됐어요
          </p>
        </div>
      )}

      {!isReportLoading && !pageLoadFailed && (hasReports ? (
        <div className="mt-3 flex flex-col gap-3">
          {reports.map((item) => (
            <div
              key={item.id}
              className="relative h-[106px] w-full rounded-16 border border-primary-500 shadow-card"
            >
              <div className="absolute left-[21px] right-[102px] top-1/2 flex -translate-y-1/2 flex-col gap-2">
                {item.tier === 'basic' ? (
                  <span className="w-fit rounded-full border border-gray-200 px-2.5 py-1.5 text-caption font-medium text-gray-400">
                    BASIC
                  </span>
                ) : (
                  <span className="flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-aqua-500 px-2 py-1.5 text-caption font-medium text-gray-25">
                    <Crown className="h-3 w-3" aria-hidden />
                    Premium
                  </span>
                )}
                <p className="text-body text-gray-900">{item.title}</p>
                <p className="pb-0.5 text-caption font-medium text-gray-400">
                  생성일: {item.createdAt}
                </p>
              </div>

              <button
                type="button"
                disabled={item.locked}
                onClick={() =>
                  navigate(`/project/${projectId}/report/${item.tier === 'basic' ? 'team' : 'personal'}`)
                }
                className={cn(
                  'absolute right-6 top-1/2 h-10 -translate-y-1/2 rounded-11 px-4 text-body',
                  item.locked ? 'bg-gray-100 text-gray-400' : 'bg-primary-500 text-gray-25'
                )}
              >
                열기
              </button>
            </div>
          ))}
        </div>
      ) : reportGenerating ? (
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">리포트를 생성하고 있어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'모든 평가가 완료되었어요\n잠시 후 리포트가 발행됩니다'}
          </p>
        </div>
      ) : reportFailed ? (
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">리포트를 생성하지 못했어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'잠시 후 다시 확인해 주세요'}
          </p>
        </div>
      ) : evaluationCompleted ? (
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">리포트 발행을 기다리고 있어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'모든 팀원이 평가를 마치면\n기여도 리포트가 자동으로 생성됩니다'}
          </p>
        </div>
      ) : (
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">아직 리포트가 없어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'Peer 평가를 완료하면 \n기여도 리포트가 자동으로 생성됩니다'}
          </p>
        </div>
      ))}

      {/* 예전에는 제출 직후 무조건 "발행되었습니다"를 띄웠는데, 실제로는 아무것도 발행되지
          않은 경우가 대부분이었다. 실제 리포트 상태를 확인한 뒤 사실에 맞는 문구를 보여준다. */}
      <AlertModal
        open={showSubmittedModal}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-100 text-primary-500">
            <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </span>
        }
        title={reportStatus === 'COMPLETED' ? '리포트가 발행되었습니다' : '평가를 제출했습니다'}
        description={
          reportStatus === 'COMPLETED'
            ? undefined
            : reportGenerating
            ? '리포트를 생성하고 있어요. 잠시만 기다려 주세요.'
            : '모든 팀원이 평가를 마치면 리포트가 발행돼요.'
        }
        confirmText="확인"
        onConfirm={() => setShowSubmittedModal(false)}
      />
    </div>
  )
}
