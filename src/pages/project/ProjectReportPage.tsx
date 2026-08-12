import { Check, Crown, Info } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertModal } from '../../components/Modal'
import { cn } from '../../lib/utils'
import { getProjectDeadline } from '../../lib/projectDate'
import { useProjectStore } from '../../store/projectStore'
import { syncProjectStatus } from '../../api/projectApi'
import { fetchEvaluationTargets } from '../../api/evaluation'
import { fetchReportDetail, generateReport, searchReports, type ReportStatus } from '../../api/report'
import { formatReportDate } from '../../lib/reportView'
import {
  clearGenerateGuard,
  markGenerateRequested,
  markGeneratingSeen,
  shouldRequestGenerate,
} from '../../lib/reportGenerateGuard'
import type { ProjectStatus } from '../../types/project'

// 생성은 멤버 수만큼 LLM을 호출해 수십 초가 걸린다. 초반엔 자주 확인하고 길어지면 간격을 늘린다.
const POLL_START_MS = 3000
const POLL_MAX_MS = 15000
// 상한은 끝나지 않은 생성이 방치되는 것을 막는 안전장치다. 화면을 벗어나면 어차피 멈춘다.
const POLL_TIMEOUT_MS = 10 * 60 * 1000
// 개인 리포트는 상세 화면 안에서 함께 제공하므로 프로젝트 리포트 목록에서는 숨긴다.
// 정책이 바뀌면 카드 구현을 복구할 수 있도록 UI 코드는 유지한다.
const SHOW_PERSONAL_REPORT_CARD = false

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** "2026-08-14" → "8월 14일". 값이 없거나 형식이 다르면 빈 문자열 */
function formatEvaluationDeadline(value: string | undefined) {
  const matched = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return matched ? `${Number(matched[2])}월 ${Number(matched[3])}일` : ''
}

// Figma의 radius/shadow 값(12/16/18/22/11px)이 기존 디자인 토큰(sm6/md10/lg14/xl20)과
// 맞지 않아 이 화면만 임의값으로 정확히 맞춤 — 팀 논의 후 토큰 확장 필요
type EvaluationStatus = 'locked' | 'unlocked' | 'submitted' | 'closed'

interface ReportItem {
  id: string
  tier: 'basic' | 'premium'
  title: string
  createdAt: string
  locked?: boolean
}

export default function ProjectReportPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const project = useProjectStore((state) =>
    state.projects.find((item) => item.id === projectId)
  )
  const justSubmittedFromNavigation =
    (location.state as { justSubmitted?: boolean } | null)?.justSubmitted === true

  const [reportId, setReportId] = useState<number | null>(null)
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [isTimeoutApplied, setIsTimeoutApplied] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [reportLoadFailed, setReportLoadFailed] = useState(false)
  const [currentProjectStatus, setCurrentProjectStatus] = useState<ProjectStatus | null>(null)
  // 평가 진행 수. 조회 전이거나 조회에 실패하면 null이다.
  const [evaluationProgress, setEvaluationProgress] = useState<{
    done: number
    total: number
    isCurrentMemberFinalSubmitted: boolean
  } | null>(null)
  const [evaluationLoadedProjectId, setEvaluationLoadedProjectId] = useState<string | null>(null)
  // 폴링 상한에 걸려 확인을 멈춘 상태. pollAttempt를 올리면 처음부터 다시 확인한다.
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const [pollAttempt, setPollAttempt] = useState(0)
  const [submittedInSession, setSubmittedInSession] = useState(justSubmittedFromNavigation)
  const [showSubmittedModal, setShowSubmittedModal] = useState(justSubmittedFromNavigation)
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

  // 리포트는 마지막 사용자의 명시적인 최종 제출 또는 평가 타임아웃으로 프로젝트가 완료될 때 만들어진다.
  // 진행 중 프로젝트에서는 상태 전환 API를 호출하지 않아 리포트 탭 진입이 최종 제출을 우회하지 않게 한다.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setReportLoadFailed(false)
    setCurrentProjectStatus(null)
    setIsTimeoutApplied(false)

    const loadReport = async () => {
      try {
        // 진행 중 프로젝트의 리포트 탭 진입만으로 완료 전환이 일어나면 최종 제출 조건을
        // 우회한다. 완료 전환은 Peer 평가 목록의 "최종 제출하기"에서만 요청한다.
        if (project?.status !== 'COMPLETED') {
          const numericProjectId = Number(projectId)
          const searched = await searchReports({ size: 100 })
          if (cancelled) return
          const found = searched.content.find((item) => item.projectId === numericProjectId)
          setCurrentProjectStatus(found ? 'COMPLETED' : (project?.status ?? null))
          applyReport({
            reportId: found?.reportId ?? null,
            status: found?.reportStatus ?? null,
            completedAt: found?.completedAt ?? null,
          })
          return
        }

        // 이미 완료된 프로젝트에서만 동기화 API를 조회해 타임아웃 발행 여부까지 복원한다.
        const res = await syncProjectStatus(projectId)
        if (cancelled) return
        setCurrentProjectStatus(res.currentStatus)
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
        setCurrentProjectStatus(found ? 'COMPLETED' : (project?.status ?? null))
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
  }, [projectId, project?.status, applyReport])

  // 평가를 어디까지 했는지 확인한다. 제출 여부를 판정하려는 게 아니라 버튼 문구를
  // "평가 시작"과 "평가 계속하기" 중에서 고르기 위한 것이다.
  useEffect(() => {
    const numericProjectId = Number(projectId)
    if (!projectId || !Number.isFinite(numericProjectId)) return
    let cancelled = false
    setEvaluationProgress(null)
    setEvaluationLoadedProjectId(null)

    void fetchEvaluationTargets(numericProjectId)
      .then((res) => {
        if (cancelled) return
        setEvaluationProgress({
          done: res.completedPeerEvaluationCount,
          total: res.totalPeerEvaluationCount,
          isCurrentMemberFinalSubmitted: res.isCurrentMemberFinalSubmitted,
        })
      })
      .catch(() => {
        // 평가 기간이 아니거나 이미 닫힌 경우 실패한다. 진행 상태를 모를 뿐이라 화면은 그대로 그린다.
        if (!cancelled) setEvaluationProgress(null)
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
    setPollTimedOut(false)
    markGeneratingSeen(reportId)

    const run = async () => {
      const startedAt = Date.now()
      let delay = POLL_START_MS
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await sleep(delay)
        if (cancelled || !activeRef.current) return

        const detail = await fetchReportDetail(reportId).catch(() => null)
        if (cancelled || !activeRef.current) return

        if (detail && detail.status !== 'GENERATING') {
          clearGenerateGuard(reportId)
          applyReport({ reportId, status: detail.status, completedAt: detail.completedAt })
          return
        }

        // 완료 전환은 리포트를 GENERATING으로 만들 뿐이고, AI 생성은 별도 호출로 시작한다.
        // 서버가 스스로 시작했다면 여기까지 오기 전에 끝나므로, 오래 머물러 있다는 건
        // 아무도 시작하지 않았다는 뜻이다. 그때 한 번만 깨운다.
        // OWNER가 아니면 403이 오는데, 방장이 이 화면에 들어올 때 처리되므로 그냥 넘어간다.
        if (shouldRequestGenerate(reportId)) {
          markGenerateRequested(reportId)
          await generateReport(reportId).catch(() => undefined)
          if (cancelled || !activeRef.current) return
        }

        delay = Math.min(Math.round(delay * 1.5), POLL_MAX_MS)
      }

      // 여기까지 왔으면 화면은 계속 "생성 중"인데 확인은 멈춘 상태다. 그대로 두면
      // 사용자는 새로고침 말고는 할 수 있는 게 없으므로 다시 확인할 길을 열어준다.
      if (!cancelled && activeRef.current) setPollTimedOut(true)
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [reportId, reportStatus, pollAttempt, applyReport])

  // 최종 제출은 서버의 사용자별 제출 기록으로 판정한다.
  // 정상 완료는 전원 제출을 의미하므로 평가 API가 닫힌 뒤에도 제출 상태를 복원할 수 있다.
  // 타임아웃 완료는 미제출 사용자가 있을 수 있어 같은 추론을 적용하지 않는다.
  const evaluationSubmitted =
    submittedInSession ||
    evaluationProgress?.isCurrentMemberFinalSubmitted === true ||
    (currentProjectStatus === 'COMPLETED' && reportStatus !== null && !isTimeoutApplied)
  const status: EvaluationStatus =
    evaluationSubmitted
      ? 'submitted'
      : currentProjectStatus === 'COMPLETED'
      ? 'closed'
      : // 종료일과 오늘을 여기서 비교하지 않는다. 서버가 자체 기준으로 개방 여부를 판정하고
        // 있어서 같은 규칙을 양쪽에서 계산하면 어긋나는 순간이 생기고, 그때 버튼은 열리는데
        // 평가 API는 거부하는 상태가 된다.
        project?.evaluationAvailable
        ? 'unlocked'
        : 'locked'

  // Peer 평가 목록에서 "최종 제출하기"로 막 넘어온 경우에만 안내를 한 번 띄운다.
  useEffect(() => {
    if (justSubmittedFromNavigation) {
      setSubmittedInSession(true)
      setShowSubmittedModal(true)
      navigate('.', { replace: true, state: null })
    }
  }, [justSubmittedFromNavigation, navigate])

  // 한 명이라도 평가했으면 "시작"이 아니라 "이어서 하기"다. 평가를 다 마치고 최종 제출만
  // 남은 사람이 "평가 시작"을 보고 이미 끝났다고 오해하는 일을 막는다.
  const evaluationInProgress = (evaluationProgress?.done ?? 0) > 0
  const deadline = project ? getProjectDeadline(project) : null
  // 평가가 언제 마감됐는지 알려줄 때만 쓴다. 서버가 안 내려주면 문구에서 생략한다.
  const evaluationDeadlineLabel = formatEvaluationDeadline(project?.evaluationDeadline)

  const handleStartEvaluation = () => {
    if (status !== 'unlocked' || !projectId) return
    navigate(`/project/${projectId}/peer-eval`)
  }

  const submittedAt = formatReportDate(completedAt)
  const isReportLoading =
    loadedProjectId !== projectId || evaluationLoadedProjectId !== projectId
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
      ) : reportLoadFailed ? (
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
      ) : status === 'closed' ? (
        /* 프로젝트가 완료됐는데 내 제출 이력을 확인할 수 없는 경우(주로 타임아웃 발행).
           예전에는 이 상태에 대응하는 화면이 없어 상단이 통째로 비어 보였다. */
        <div className="flex items-center gap-3.5 rounded-18 bg-gray-50 px-5 py-[22px]">
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-body-sm font-semibold text-gray-400">Peer 평가가 종료되었어요</p>
            <p className="text-caption font-medium text-gray-400">
              {evaluationDeadlineLabel
                ? `${evaluationDeadlineLabel}에 마감되어 더 이상 제출할 수 없어요`
                : '프로젝트가 완료되어 더 이상 제출할 수 없어요'}
            </p>
          </div>
          <div className="flex h-[46px] shrink-0 items-center rounded-12 bg-gray-100 px-[18px]">
            <span className="text-title font-bold text-gray-400">종료</span>
          </div>
        </div>
      ) : null}

      {!isReportLoading && !reportLoadFailed && status === 'unlocked' && (
        <button
          type="button"
          aria-label={evaluationInProgress ? 'Peer 평가 계속하기' : 'Peer 평가 시작'}
          onClick={handleStartEvaluation}
          className="flex w-full items-center gap-3.5 rounded-18 bg-gradient-to-r from-primary-500 to-aqua-500 px-5 py-[22px] text-left shadow-cta"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {deadline && (
              <span className="flex h-[18px] w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-navy-700">
                {deadline.label}
              </span>
            )}
            <p className="break-keep text-body-sm font-bold leading-5 tracking-[-0.4px] text-gray-25">
              {evaluationInProgress ? 'Peer 평가를 이어서 해주세요' : 'Peer 평가를 시작하세요'}
            </p>
            <p className="break-keep text-caption font-medium text-gray-25">
              AI 리포트 생성을 위해 평가가 필요해요
            </p>
          </div>
          <span className="flex h-[46px] shrink-0 items-center whitespace-nowrap rounded-12 bg-gray-25 px-[18px] text-title font-bold text-navy-700">
            {evaluationInProgress ? '이어서 하기' : '평가 시작'}
          </span>
        </button>
      )}

      {!isReportLoading &&
        !reportLoadFailed &&
        (status === 'submitted' || showSubmittedModal) &&
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
      {!isReportLoading && !reportLoadFailed && hasReports && isTimeoutApplied && (
        <div className="mt-3 flex items-start gap-2 rounded-12 bg-primary-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden />
          <p className="text-caption font-medium text-primary-500">
            일부 팀원이 평가를 제출하지 않아, 제출된 평가와 수집된 활동을 기준으로 발행됐어요
          </p>
        </div>
      )}

      {!isReportLoading && !reportLoadFailed && (hasReports ? (
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
          <p className="text-title font-medium text-gray-500">
            {pollTimedOut ? '리포트 생성이 예상보다 오래 걸리고 있어요' : '리포트를 생성하고 있어요'}
          </p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {pollTimedOut
              ? '잠시 후 다시 확인해 주세요'
              : '모든 평가가 완료되었어요\n잠시 후 리포트가 발행됩니다'}
          </p>
          {pollTimedOut && (
            <button
              type="button"
              onClick={() => setPollAttempt((value) => value + 1)}
              className="h-10 rounded-11 bg-primary-500 px-4 text-body text-gray-25"
            >
              다시 확인
            </button>
          )}
        </div>
      ) : reportFailed ? (
        // 실패한 리포트는 재생성이 막혀 있어(409) 기다린다고 상태가 바뀌지 않는다.
        // "잠시 후 다시 확인해 주세요"는 영원히 오지 않을 변화를 기다리게 만든다.
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">리포트를 생성하지 못했어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'자동으로 다시 생성되지는 않아요\n문제가 계속되면 문의해 주세요'}
          </p>
        </div>
      ) : evaluationSubmitted ? (
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
