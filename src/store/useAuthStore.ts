import { create } from 'zustand'

// Zustand 스토어 작성 예시
// 다른 전역 상태(필터, 채팅 등)도 이 패턴으로 src/store/ 아래에 추가
interface AuthState {
  nickname: string | null
  isLoggedIn: boolean
  login: (nickname: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  nickname: null,
  isLoggedIn: false,
  login: (nickname) => set({ nickname, isLoggedIn: true }),
  logout: () => set({ nickname: null, isLoggedIn: false }),
}))
