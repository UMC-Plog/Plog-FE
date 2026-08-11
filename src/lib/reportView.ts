// 리포트 응답을 화면이 쓰는 형태로 변환한다.
//
// 서버는 지표를 원자 단위(개수·비율)로만 내려주고, 화면은 "13건 완료" 같은 문장과
// 라벨이 붙은 점수 배열을 쓴다. 그 조립을 컴포넌트 안에서 하면 JSX가 지저분해지고
// null 처리가 곳곳에 흩어지므로 여기서 한 번에 처리한다.
//
// 계산 근거가 없으면 서버가 null이나 빈 값을 주므로(업무가 없으면 completionRate=null 등)
// 모든 변환은 값이 없을 때를 기본값으로 흡수한다.

import type {
  CompetencyKey,
  CompetencyScores,
  ReportDetailResponse,
  ReportMemberResultResponse,
  ReportMemberSummaryResponse,
} from '../api/report'
import {
  REPORT_SERIES_COLORS,
  type InsightIconKey,
  type PersonalReportView,
  type StrengthIconKey,
  type TeamReportView,
} from './reportViewTypes'
import type { ProfilePreset } from './profilePreset'

/** 역량 표시 순서와 라벨. LEADERSHIP은 주도성 점수다(API 설명 기준). */
const COMPETENCY_LABELS: { key: CompetencyKey; label: string }[] = [
  { key: 'COLLABORATION', label: '협업 태도' },
  { key: 'LEADERSHIP', label: '리더십' },
  { key: 'COMMUNICATION', label: '커뮤니케이션' },
  { key: 'OUTPUT', label: '산출물 기여' },
]

const round = (value: number | null | undefined) => Math.round(value ?? 0)

export const formatReportDate = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

/** 히어로 배지에 쓰는 "05.01–06.12" 형태 */
const formatPeriod = (start: string | null, end: string | null) => {
  const short = (iso: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
  }
  const from = short(start)
  const to = short(end)
  return from && to ? `${from}–${to}` : from || to
}

/** 근거가 없는 역량은 서버가 아예 내려주지 않으므로 0으로 채워 축 4개를 항상 그린다 */
export const toCompetencyScores = (scores: CompetencyScores) =>
  COMPETENCY_LABELS.map(({ key, label }) => ({ label, score: scores[key] ?? 0 }))

const toActivityText = (member: ReportMemberSummaryResponse) =>
  `전체 ${member.totalTaskCount}개 · 완료 ${member.completedTaskCount}개 · 완료율 ${round(member.completionRate)}%`

export function toTeamReportView(detail: ReportDetailResponse): TeamReportView {
  const members = detail.members

  // 계산 가능한 팀원만 분모에 포함한다. 0%는 유효한 기여율이므로 제외하지 않는다.
  const measurableContributions = members
    .map((member) => member.contributionRate)
    .filter((rate): rate is number => rate !== null)
  const averageContribution =
    measurableContributions.length > 0
      ? measurableContributions.reduce((sum, rate) => sum + rate, 0) /
        measurableContributions.length
      : 0

  return {
    projectName: detail.projectName,
    publishedAt: formatReportDate(detail.completedAt),
    memberCount: detail.memberCount,
    period: formatPeriod(detail.projectStartDate, detail.projectEndDate),

    taskCompletionRate: round(detail.teamCompletionRate),
    taskCompletionCaption: {
      muted: `전체 업무 ${detail.totalTaskCount}건 기준`,
      highlight: `${detail.completedTaskCount}건 완료`,
    },
    deadlineRate: round(detail.teamDeadlineComplianceRate),
    deadlineCaption: {
      muted: '기한 내 완료',
      highlight: `${detail.deadlineMetTaskCount}/${detail.deadlineTargetTaskCount}건`,
    },

    // 생성에 실패하면 null이 온다. 두 문장이 다 없을 때만 대체 문구를 쓴다.
    aiInsight:
      [detail.teamStrength, detail.teamSuggestion].filter(Boolean).join(' ') ||
      '분석할 활동이 충분하지 않아 인사이트를 생성하지 못했어요',

    completionRows: members.map((m) => ({
      name: m.memberName,
      profilePreset: (m.profilePreset ?? 'OTTER') as ProfilePreset,
      total: m.totalTaskCount,
      done: m.completedTaskCount,
      doneRate: round(m.completionRate),
      deadlineRate: round(m.deadlineComplianceRate),
    })),

    contributions: members.map((m, index) => ({
      name: m.memberName,
      percent: round(m.contributionRate),
      color: REPORT_SERIES_COLORS[index % REPORT_SERIES_COLORS.length],
    })),
    averageContribution: round(averageContribution),

    members: members.map((m) => ({
      name: m.memberName,
      profilePreset: (m.profilePreset ?? 'OTTER') as ProfilePreset,
      keywords: m.peerKeywords,
      activity: toActivityText(m),
      aiComment: m.headline ?? '평가 근거가 부족해 한줄 평가를 생성하지 못했어요',
      scores: toCompetencyScores(m.peerCompetencyScores),
      peerAverage: m.peerAverage ?? 0,
    })),
  }
}

// 강점 카드와 인사이트의 아이콘은 서버가 주지 않는다. API 설명대로 프론트가 순서대로 매핑한다.
const STRENGTH_ICON_ORDER: StrengthIconKey[] = ['team', 'pen', 'chat']
const INSIGHT_ICON_ORDER: InsightIconKey[] = ['growth', 'star', 'target']

export function toPersonalReportView(result: ReportMemberResultResponse): PersonalReportView {
  const growth = result.growth
  const writing = result.writing

  return {
    reportCode: result.reportCode,
    projectName: result.projectName,
    publishedAt: formatReportDate(result.completedAt),
    period: formatPeriod(result.projectStartDate, result.projectEndDate),
    ownerName: result.memberName,

    contributionScore: round(result.finalScore),
    collaborationStability: round(result.collaborationStability),
    aiComment: result.headline ?? '분석할 활동이 충분하지 않아 한줄 평가를 생성하지 못했어요',

    // 0~100 환산 점수를 쓴다. 근거가 없는 역량은 0으로 채워 네 항목을 항상 보여준다.
    detailRows: COMPETENCY_LABELS.map(({ key, label }, index) => ({
      label,
      score: round(result.competencyScores100[key]),
      color: REPORT_SERIES_COLORS[index % REPORT_SERIES_COLORS.length],
    })),

    strengths: result.strengths.map((card, index) => ({
      icon: STRENGTH_ICON_ORDER[index % STRENGTH_ICON_ORDER.length],
      title: card.title,
      description: card.description,
    })),

    // 근거가 부족하면 weakness 자체가 null로 온다. 섹션을 비우지 않도록 기본 문구를 채운다.
    weakness: {
      percent: round(result.vulnerability),
      title: result.weakness?.title ?? '아직 뚜렷한 취약점이 발견되지 않았어요',
      tips: result.weakness?.suggestions ?? [],
    },

    insights: growth
      ? [
          { icon: INSIGHT_ICON_ORDER[0], label: '성장 포인트', text: growth.growthPoint },
          { icon: INSIGHT_ICON_ORDER[1], label: '유지 강점', text: growth.keepStrength },
          { icon: INSIGHT_ICON_ORDER[2], label: '다음 액션', text: growth.nextAction },
        ]
      : [],

    sentences: writing
      ? [
          { label: 'AI 자기소개서 추천 문장', text: writing.coverLetter },
          { label: 'AI 포트폴리오 추천 문장', text: writing.portfolio },
        ]
      : [],
  }
}
