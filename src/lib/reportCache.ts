// 팀·개인 리포트 화면이 공유하는 조회 결과 캐시.
//
// 두 화면은 하단 탭으로 서로 오가는 구조라, 매번 리포트를 다시 찾고 상세를 받아오면
// 탭을 누를 때마다 빈 화면이 스친다. 발행된 리포트는 내용이 바뀌지 않으므로 캐시해 둔다.
//
// 다만 개인 리포트는 "내" 결과다. 같은 탭에서 로그아웃하고 다른 계정으로 들어오면
// 이전 사용자의 리포트가 그대로 보이므로, 로그아웃 시점에 반드시 비운다.

import type { PersonalReportView, TeamReportView } from './reportViewTypes'

export const teamReportCache = new Map<string, { reportId: number; report: TeamReportView }>()

export const personalReportCache = new Map<
  string,
  { reportId: number; report: PersonalReportView; cautionText: string | null; pdfAvailable: boolean }
>()

export function clearReportCache() {
  teamReportCache.clear()
  personalReportCache.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('plog:logout', clearReportCache)
}
