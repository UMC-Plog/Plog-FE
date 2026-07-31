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

function getServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: String(firebaseConfig.apiKey),
    authDomain: String(firebaseConfig.authDomain),
    projectId: String(firebaseConfig.projectId),
    storageBucket: String(firebaseConfig.storageBucket ?? ''),
    messagingSenderId: String(firebaseConfig.messagingSenderId),
    appId: String(firebaseConfig.appId),
  })
  return `/firebase-messaging-sw.js?${params.toString()}`
}

async function getMessagingRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('이 브라우저에서는 백그라운드 알림을 지원하지 않습니다.')
  }
  return navigator.serviceWorker.register(getServiceWorkerUrl(), {
    scope: '/',
    updateViaCache: 'none',
  })
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
