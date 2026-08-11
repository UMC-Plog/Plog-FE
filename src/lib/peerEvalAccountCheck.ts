// "내 계정 선택"을 끝까지 진행했는지 기록한다.
//
// 계정을 하나라도 고르면 서버에 매핑이 남아 "선택완료"를 판정할 수 있지만, 전부 건너뛴 경우에는
// 서버에 아무 흔적도 남지 않아 "아직 안 들어가봤음"과 구분할 수 없다. 배지 표시 용도라서
// 로컬에 기록해 두는 것으로 충분하다고 보고, 기기가 바뀌면 다시 "연결하기"로 보이는 것은 감수한다.

import { useAuthStore } from '../store/authStore'

const KEY_PREFIX = 'plog-account-check-'

function getKey(projectId: string) {
  const userId = useAuthStore.getState().user?.id ?? 'anonymous'
  return `${KEY_PREFIX}${userId}-${projectId}`
}

function getProviderSignature(providers: readonly string[]) {
  return [...providers].sort().join(',')
}

export function markAccountCheckDone(projectId: string, providers: readonly string[]) {
  window.localStorage.setItem(getKey(projectId), getProviderSignature(providers))
}

export function isAccountCheckDone(projectId: string, providers: readonly string[]) {
  return window.localStorage.getItem(getKey(projectId)) === getProviderSignature(providers)
}
