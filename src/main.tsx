import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reissueAccessToken } from './api/client'
import { useAuthStore } from './store/authStore'

// 앱 부팅 시 저장된 refreshToken이 있으면 곧바로 재발급을 시도해 세션을 미리 갱신한다.
// 기존에는 실제 API 호출이 401을 받아야만(반응형) 재발급이 시작됐는데, 그 사이 accessToken이
// 이미 만료된 채로 화면이 그려지는 순간을 줄이기 위한 보완이다.
//
// zustand persist의 localStorage 하이드레이션은 겉보기와 달리 항상 비동기(Promise)로
// 처리되므로, 스토어 생성 직후 곧바로 읽으면 아직 하이드레이션 전 초기값(null)일 수 있다.
// 반드시 하이드레이션이 끝난 뒤에 읽어야 한다.
const bootReissueIfNeeded = () => {
  if (useAuthStore.getState().refreshToken) {
    void reissueAccessToken()
  }
}

if (useAuthStore.persist.hasHydrated()) {
  bootReissueIfNeeded()
} else {
  useAuthStore.persist.onFinishHydration(bootReissueIfNeeded)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
