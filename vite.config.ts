import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // sockjs-client가 참조하는 Node의 global 객체를 브라우저 환경에서 globalThis로 대체
  define: {
    global: 'globalThis',
  },
})
