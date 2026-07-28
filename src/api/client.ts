export const BASE_URL = 'https://api.umc-plog.site'

export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
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

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data: ApiEnvelope<T> = await res.json()

  if (!data.isSuccess) {
    throw new ApiError(data.code, data.message)
  }

  return data.result
}
