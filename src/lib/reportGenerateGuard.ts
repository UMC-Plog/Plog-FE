// 리포트 AI 생성이 시작되지 않은 채 방치되는 것을 막는 감시자의 기록장.
//
// 프로젝트가 완료로 전환되면 리포트가 GENERATING 상태로 만들어지지만, 실제 AI 생성은
// POST /generate로 따로 시작해야 한다. 서버가 완료 전환 시점에 스스로 시작해줄 수도 있어서
// 무조건 호출하면 생성이 두 번 돌 수 있다 — 409는 COMPLETED/FAILED에만 걸리기 때문이다.
//
// 그래서 즉시 부르지 않고, GENERATING이 "생성에 걸리는 시간"보다 훨씬 오래 유지될 때만 부른다.
// 서버가 이미 시작했다면 그 전에 COMPLETED가 되어 감시자가 발동하지 않고,
// 아무도 시작하지 않았다면 그때 한 번 부른다.
//
// 화면을 들락거려도 대기 시간이 처음부터 다시 시작되지 않도록 처음 목격한 시각을 남긴다.
// 호출 이력도 남겨 새로고침 후 같은 리포트에 다시 요청하는 일을 막는다.

import { useAuthStore } from '../store/authStore'

/** 생성은 "수십 초"가 걸린다고 명시돼 있다. 여유를 크게 잡아 중복 호출 가능성을 줄인다. */
export const GENERATE_WATCHDOG_MS = 3 * 60 * 1000

const KEY_PREFIX = 'plog-report-generate-'

interface GuardRecord {
  /** GENERATING 상태를 처음 목격한 시각 */
  firstSeenAt: number
  /** generate를 호출한 시각. 아직 부르지 않았으면 없음 */
  requestedAt?: number
}

function getKey(reportId: number) {
  const userId = useAuthStore.getState().user?.id ?? 'anonymous'
  return `${KEY_PREFIX}${userId}-${reportId}`
}

function read(reportId: number): GuardRecord | null {
  try {
    const raw = window.localStorage.getItem(getKey(reportId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Partial<GuardRecord>
    if (typeof record.firstSeenAt !== 'number') return null
    return {
      firstSeenAt: record.firstSeenAt,
      requestedAt: typeof record.requestedAt === 'number' ? record.requestedAt : undefined,
    }
  } catch {
    // 저장 값이 깨졌으면 기록이 없는 것으로 보고 다시 시작한다.
    return null
  }
}

function write(reportId: number, record: GuardRecord) {
  try {
    window.localStorage.setItem(getKey(reportId), JSON.stringify(record))
  } catch {
    // 저장 실패(용량 초과·사생활 보호 모드)는 감시자를 늦출 뿐이라 무시한다.
  }
}

/** GENERATING을 목격했음을 남기고, 처음 목격한 시각을 돌려준다. */
export function markGeneratingSeen(reportId: number) {
  const existing = read(reportId)
  if (existing) return existing.firstSeenAt

  const now = Date.now()
  write(reportId, { firstSeenAt: now })
  return now
}

/**
 * 지금 generate를 호출해야 하는지 판단한다.
 * 대기 시간을 넘겼고 아직 한 번도 부른 적이 없을 때만 true다.
 */
export function shouldRequestGenerate(reportId: number) {
  const record = read(reportId)
  if (!record || record.requestedAt !== undefined) return false
  return Date.now() - record.firstSeenAt >= GENERATE_WATCHDOG_MS
}

/** 호출했음을 남긴다. 실패했더라도 남겨서 같은 리포트에 반복 요청하지 않는다. */
export function markGenerateRequested(reportId: number) {
  const record = read(reportId) ?? { firstSeenAt: Date.now() }
  write(reportId, { ...record, requestedAt: Date.now() })
}

/** 생성이 끝나면 더 볼 일이 없으므로 지운다. */
export function clearGenerateGuard(reportId: number) {
  try {
    window.localStorage.removeItem(getKey(reportId))
  } catch {
    // 지우지 못해도 다음 판단에 영향을 주지 않는다.
  }
}
