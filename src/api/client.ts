// TODO: 백엔드 API 베이스 URL 확정되면 .env로 분리
// 예: const BASE_URL = import.meta.env.VITE_API_BASE_URL

export const BASE_URL = 'http://localhost:8080/api' // 임시값

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}
