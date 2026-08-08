/* global firebase */

const params = new URL(self.location.href).searchParams

// iOS 홈 화면 웹앱은 백그라운드로 내려가도 페이지를 계속 visible로 보고한다. 그러면 FCM이
// "앱이 열려 있으니 시스템 알림 대신 페이지로 넘기자"고 오판해서, 얼어붙어 아무것도 못 그리는
// 페이지로 메시지를 보내고 사용자에게는 알림이 전혀 보이지 않는다. iOS에서는 visibility 판단을
// 건너뛰고 직접 알림을 띄운다. (UA는 iPadOS가 Macintosh로 보고해 서비스워커 안에서 판별할 수
// 없어, 페이지가 정해서 넘겨준 값을 쓴다.)
const IS_IOS = params.get('ios') === '1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// 알림을 눌렀을 때 갈 곳. 서비스워커는 번들 밖이라 src를 import할 수 없어 규칙을 옮겨 적는다.
// src/api/notification.ts 의 resolveNotificationPath와 항상 같이 고쳐야 한다.
//
// 서비스워커는 REST 응답을 못 보고 FCM data 필드만 참조한다. data.type이 없으면(서버가 아직
// 안 넣어주거나 모르는 타입이면) 기존처럼 채팅방으로 보낸다.
function resolveNotificationPath(type, projectId, resourceId) {
  const base = `/project/${projectId}`
  switch (type) {
    case 'PEER_EVALUATION_STARTED':
      return `${base}/peer-eval`
    case 'REPORT_PUBLISHED':
      return `${base}/report/team`
    case 'NOTICE':
      return resourceId ? `${base}/posts/${resourceId}` : `${base}/feed`
    default:
      return `${base}/chat`
  }
}

// FCM이 자체 push 핸들러를 등록하기 전에 먼저 등록해야 stopImmediatePropagation이 먹는다.
// 전파를 막지 않으면 앱이 완전히 종료된 상태에서 FCM이 알림을 한 번 더 띄워 중복으로 표시된다.
self.addEventListener('push', (event) => {
  if (!IS_IOS) return
  event.stopImmediatePropagation()

  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    // 형식이 어긋난 페이로드 하나 때문에 알림 자체가 사라지지 않도록 기본 문구로 띄운다
  }
  const notification = payload.notification ?? {}
  const data = payload.data ?? {}

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(notification.title ?? data.title ?? '새 알림', {
        body: notification.body ?? data.body ?? '',
        icon: '/favicon.svg',
        data,
      })
      // FCM 경로를 끊었으므로 페이지의 onMessage가 호출되지 않는다. 알림 목록·채팅 목록이
      // 갱신되도록 같은 의미의 신호만 직접 전달한다.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      clients.forEach((client) => client.postMessage({ type: 'plog:push-received' }))
    })(),
  )
})

// FCM이 자체 notificationclick 핸들러를 등록하기 전에 앱 이동 로직을 등록한다.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const fcmData = event.notification.data?.FCM_MSG?.data ?? event.notification.data ?? {}
  const targetUrl = fcmData.projectId
    ? resolveNotificationPath(fcmData.type, fcmData.projectId, fcmData.resourceId)
    : '/notifications'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const sameOriginClient = clients.find((client) => new URL(client.url).origin === self.location.origin)
      if (sameOriginClient) {
        sameOriginClient.navigate(targetUrl)
        return sameOriginClient.focus()
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})

importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

firebase.messaging()
