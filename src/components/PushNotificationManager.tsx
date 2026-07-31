import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onMessage, type MessagePayload } from 'firebase/messaging'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'
import { ensurePushNotificationsRegistered } from '../lib/firebaseMessaging'
import { isNotificationEnabled } from '../lib/notificationSettings'
import { useAuthStore } from '../store/authStore'

interface PushBanner {
  title: string
  body: string
  projectId?: string
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function toBanner(payload: MessagePayload): PushBanner {
  return {
    title: payload.notification?.title ?? '새 알림',
    body: payload.notification?.body ?? '새로운 멘션이 도착했어요.',
    projectId: payload.data?.projectId,
  }
}

export function PushNotificationManager() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [banner, setBanner] = useState<PushBanner | null>(null)

  useEffect(() => {
    if (!accessToken || !isNotificationEnabled()) return
    void ensurePushNotificationsRegistered().catch(() => undefined)
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || !firebaseConfig.apiKey) return
    let unsubscribe: (() => void) | undefined
    let active = true

    void isSupported().then((supported) => {
      if (!supported || !active) return
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
      unsubscribe = onMessage(getMessaging(app), (payload) => {
        setBanner(toBanner(payload))
        window.dispatchEvent(new CustomEvent('plog:notification-received'))
      })
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [accessToken])

  useEffect(() => {
    if (!banner) return
    const timer = window.setTimeout(() => setBanner(null), 5000)
    return () => window.clearTimeout(timer)
  }, [banner])

  if (!banner) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (banner.projectId) navigate(`/project/${banner.projectId}/chat`)
        setBanner(null)
      }}
      className="fixed left-1/2 top-4 z-[100] flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left shadow-xl"
      aria-label={`${banner.title}: ${banner.body}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
        <Bell size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[14px] text-gray-900">{banner.title}</strong>
        <span className="mt-0.5 line-clamp-2 block text-[12px] text-gray-500">{banner.body}</span>
      </span>
    </button>
  )
}
