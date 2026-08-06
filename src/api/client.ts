import { useAuthStore } from '../store/authStore'

export const BASE_URL = 'https://api.umc-plog.site'

export class ApiError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

interface ApiEnvelope<T> {
  isSuccess: boolean
  code: string
  message: string
  result: T
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  accessToken?: string
}

async function rawRequest<T>(path: string, options: ApiRequestOptions, token?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data: ApiEnvelope<T> = await res.json()
  return { status: res.status, data }
}

let reissuePromise: Promise<string | null | undefined> | null = null

// accessToken 만료(401) 시 refreshToken으로 한 번만 재발급 시도. 동시에 여러 요청이 401을 받아도
// 재발급 API는 한 번만 호출되도록 진행 중인 Promise를 공유한다 (refreshToken은 재발급마다 회전되므로).
//
// 반환값 구분이 중요하다: null은 "백엔드가 명시적으로 재발급을 거부함(진짜 만료)" -> 로그아웃 처리.
// undefined는 "네트워크 단절 등으로 재발급 시도 자체가 실패함(토큰 유효성은 알 수 없음)" -> 세션은
// 유지하고 이번 요청만 실패시킨다. 이 둘을 구분하지 않으면 노트북 절전 복귀 등으로 잠깐 네트워크가
// 끊긴 순간에 유효한 refreshToken까지 지워버려 "웹 껐다 켜면 로그아웃된다"는 문제가 생긴다.
export function reissueAccessToken(): Promise<string | null | undefined> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return Promise.resolve(null)

  if (!reissuePromise) {
    reissuePromise = rawRequest<{ accessToken: string; refreshToken: string }>(
      '/api/auth/reissue',
      { method: 'POST', body: { refreshToken } }
    )
      .then(({ data }) => {
        if (!data.isSuccess) return null
        useAuthStore.getState().setTokens(data.result)
        return data.result.accessToken
      })
      .catch(() => undefined)
      .finally(() => {
        reissuePromise = null
      })
  }

  return reissuePromise
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = options.accessToken ?? useAuthStore.getState().accessToken ?? undefined
  const { status, data } = await rawRequest<T>(path, options, token)

  if (status === 401 && token) {
    const newToken = await reissueAccessToken()

    if (newToken) {
      const retried = await rawRequest<T>(path, options, newToken)
      if (!retried.data.isSuccess) {
        throw new ApiError(retried.data.code, retried.data.message, retried.status)
      }
      return retried.data.result
    }

    if (newToken === undefined) {
      throw new ApiError('NETWORK_ERROR', '네트워크 연결을 확인한 후 다시 시도해 주세요.', status)
    }

    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new ApiError('AUTH_EXPIRED', '다시 로그인해 주세요.', 401)
  }

  if (!data.isSuccess) {
    throw new ApiError(data.code, data.message, status)
  }

  return data.result
}
