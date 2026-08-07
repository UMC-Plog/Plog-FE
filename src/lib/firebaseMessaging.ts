import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from 'firebase/messaging'
import { deleteFcmToken, registerFcmToken } from '../api/fcm'
import {
  FCM_TOKEN_STORAGE_KEY,
  isNotificationEnabled,
} from './notificationSettings'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

function assertFirebaseConfig() {
  const requiredValues = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId,
    vapidKey,
  ]
  if (requiredValues.some((value) => !value)) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.')
  }
}

async function getFirebaseMessaging(): Promise<Messaging> {
  assertFirebaseConfig()
  if (!(await isSupported())) {
    throw new Error('이 브라우저에서는 푸시 알림을 지원하지 않습니다.')
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return getMessaging(app)
}

// iPadOS 13+는 userAgent를 Macintosh로 보고해서 UA만으로는 iOS를 구분할 수 없다. 데스크톱 맥과
// 달리 터치 포인트가 있다는 점으로 갈라낸다. 서비스워커 안에서는 이 판별을 할 수 없어(navigator가
// 제한적) 페이지에서 정한 값을 등록 URL로 넘긴다.
function isIosDevice() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function getServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: String(firebaseConfig.apiKey),
    authDomain: String(firebaseConfig.authDomain),
    projectId: String(firebaseConfig.projectId),
    storageBucket: String(firebaseConfig.storageBucket ?? ''),
    messagingSenderId: String(firebaseConfig.messagingSenderId),
    appId: String(firebaseConfig.appId),
    ios: isIosDevice() ? '1' : '0',
  })
  return `/firebase-messaging-sw.js?${params.toString()}`
}

async function getMessagingRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('이 브라우저에서는 백그라운드 알림을 지원하지 않습니다.')
  }
  const registration = await navigator.serviceWorker.register(getServiceWorkerUrl(), {
    scope: '/',
    updateViaCache: 'none',
  })

  if (registration.active) return registration

  const activatingWorker = registration.installing ?? registration.waiting
  if (!activatingWorker) {
    throw new Error('알림 서비스 초기화 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.')
  }
  const worker = activatingWorker

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('알림 서비스 활성화 시간이 초과되었습니다. 새로고침 후 다시 시도해 주세요.'))
    }, 15_000)

    const handleStateChange = () => {
      if (worker.state === 'activated') {
        cleanup()
        resolve()
      } else if (worker.state === 'redundant') {
        cleanup()
        reject(new Error('알림 서비스 활성화에 실패했습니다. 새로고침 후 다시 시도해 주세요.'))
      }
    }

    function cleanup() {
      window.clearTimeout(timeoutId)
      worker.removeEventListener('statechange', handleStateChange)
    }

    worker.addEventListener('statechange', handleStateChange)
    handleStateChange()
  })

  return registration
}

export async function enablePushNotifications() {
  if (!('Notification' in window)) {
    throw new Error('이 브라우저에서는 알림을 지원하지 않습니다.')
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('알림 권한이 허용되지 않았습니다. 브라우저 설정에서 알림을 허용해 주세요.')
  }

  const messaging = await getFirebaseMessaging()
  const serviceWorkerRegistration = await getMessagingRegistration()
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  })
  if (!token) throw new Error('푸시 알림 토큰을 발급하지 못했습니다.')

  await registerFcmToken(token)
  window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token)
  return token
}

export async function ensurePushNotificationsRegistered() {
  if (
    !isNotificationEnabled() ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) return null
  return enablePushNotifications()
}

export async function disablePushNotifications(
  options: { bestEffort?: boolean } = {},
) {
  const storedToken = window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY)
  if (storedToken) {
    try {
      await deleteFcmToken(storedToken)
    } catch (error) {
      if (!options.bestEffort) throw error
    }
  }

  try {
    const messaging = await getFirebaseMessaging()
    await deleteToken(messaging)
  } catch {
    // 설정 누락·미지원 환경에서도 로컬 토큰과 설정은 정상적으로 정리한다.
  }
  window.localStorage.removeItem(FCM_TOKEN_STORAGE_KEY)
}
