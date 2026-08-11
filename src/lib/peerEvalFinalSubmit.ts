// Peer 평가 "최종 제출"을 마쳤는지 기록한다.
//
// 서버는 사용자별 최종 제출 이력을 남기지 않는다. 프로젝트 완료 전환(PATCH /status)만 있고,
// 다른 팀원이 아직 제출하지 않았으면 프로젝트는 진행 중으로 남아 내 제출 여부를 알 길이 없다.
//
// 예전에는 "팀원 평가를 다 했으면 제출한 것"으로 추측했는데, 내 계정 선택이 남아 최종 제출을
// 하지 못한 사람까지 제출 완료로 보였다. 그러면 리포트 화면에서 평가 진입 버튼이 사라지는데
// 그 버튼이 유일한 입구라, 제출을 마치러 돌아갈 방법이 없어졌다.
//
// 기기가 바뀌면 기록이 없어 다시 제출 화면으로 안내되지만, 최종 제출은 여러 번 눌러도 무해해서
// 안전한 쪽으로 실패한다.

import { useAuthStore } from '../store/authStore'

const KEY_PREFIX = 'plog-final-submit-'

function getKey(projectId: string) {
  const userId = useAuthStore.getState().user?.id ?? 'anonymous'
  return `${KEY_PREFIX}${userId}-${projectId}`
}

export function markFinalSubmitted(projectId: string) {
  window.localStorage.setItem(getKey(projectId), String(Date.now()))
}

export function isFinalSubmitted(projectId: string) {
  return window.localStorage.getItem(getKey(projectId)) !== null
}
