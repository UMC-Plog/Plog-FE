import { Check, Crown, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertModal } from '../../components/Modal'
import { cn } from '../../lib/utils'
import { getProjectDeadline, isFutureDate } from '../../lib/projectDate'
import { useProjectStore } from '../../store/projectStore'
import { fetchEvaluationTargets, fetchMySelfFeedback } from '../../api/evaluation'
import { searchReports, type ReportSearchResponse } from '../../api/report'

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

  const [evalComplete, setEvalComplete] = useState(false)
  const [report, setReport] = useState<ReportSearchResponse | null>(null)

  // Peer평가/자기피드백 전원 완료 여부와, 이미 생성된 리포트가 있는지를 실제 API로 확인한다.
  // projectStore에 아직 이 프로젝트가 안 불러와졌어도 projectId만 유효하면 호출한다.
  useEffect(() => {
    const numericProjectId = Number(projectId)
    if (!Number.isFinite(numericProjectId)) return
    let cancelled = false

    Promise.all([
      fetchEvaluationTargets(numericProjectId),
      fetchMySelfFeedback(numericProjectId)
        .then(() => true)
        .catch(() => false),
    ])
      .then(([targetsRes, selfDone]) => {
        if (cancelled) return
        const allDone =
          targetsRes.targets.length > 0 &&
          targetsRes.targets.every((t) => t.isEvaluated) &&
          selfDone
        setEvalComplete(allDone)
      })
      .catch(() => undefined)

    // keyword 검색은 이름이 겹치는 다른 프로젝트를 잘못 집어올 수 있어 projectId로 다시 필터링한다.
    searchReports({ size: 100 })
      .then((res) => {
        if (!cancelled) setReport(res.content.find((item) => item.projectId === numericProjectId) ?? null)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [projectId])

  const status: EvaluationStatus =
    evalComplete || report?.reportStatus === 'COMPLETED'
      ? 'submitted'
      : project && !isFutureDate(project.expectedEndDate)
      ? 'unlocked'
      : 'locked'

  const [showPublishedModal, setShowPublishedModal] = useState(false)

  // Peer 평가 목록에서 "최종 제출하기"로 막 넘어온 경우에만 발행 모달을 한 번 띄움
  useEffect(() => {
    if ((location.state as { justSubmitted?: boolean } | null)?.justSubmitted) {
      setShowPublishedModal(true)
      navigate('.', { replace: true, state: null })
    }
  }, [location.state, navigate])

  const deadline = project ? getProjectDeadline(project) : null

  const handleStartEvaluation = () => {
    if (status !== 'unlocked' || !projectId) return
    navigate(`/project/${projectId}/peer-eval`)
  }

  const submittedAt = formatReportDate(report?.completedAt ?? null)
  const reportGenerating = status === 'submitted' && report?.reportStatus !== 'COMPLETED'
  const reports: ReportItem[] =
    status === 'submitted' && report?.reportStatus === 'COMPLETED'
      ? [
          { id: String(report.reportId), tier: 'basic', title: `${project?.name ?? report.projectName} 기여도 분석 리포트`, createdAt: submittedAt },
          { id: 'premium', tier: 'premium', title: '개인 기여도 리포트', createdAt: submittedAt, locked: true },
        ]
      : []
  const hasReports = reports.length > 0

  return (
    <div className="min-h-[calc(100svh-theme(spacing.12)-theme(spacing.10))] bg-gray-25 px-[21px] pt-[22px] pb-6">
      {status === 'locked' && (
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
      )}

      {status === 'unlocked' && (
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

      {hasReports ? (
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
      ) : (
        <div className="mt-[72px] flex flex-col items-center gap-4">
          <p className="text-title font-medium text-gray-500">아직 리포트가 없어요</p>
          <p className="whitespace-pre-line text-center text-body-sm text-gray-400">
            {'Peer 평가를 완료하면 \n기여도 리포트가 자동으로 생성됩니다'}
          </p>
        </div>
      )}

      <AlertModal
        open={showPublishedModal}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-100 text-primary-500">
            <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </span>
        }
        title="리포트가 발행되었습니다"
        confirmText="확인"
        onConfirm={() => setShowPublishedModal(false)}
      />
    </div>
  )
}
