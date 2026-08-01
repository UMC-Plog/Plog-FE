/* global firebase */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// FCM이 자체 notificationclick 핸들러를 등록하기 전에 앱 이동 로직을 등록한다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const fcmData = event.notification.data?.FCM_MSG?.data ?? event.notification.data ?? {}
  const targetUrl = fcmData.projectId
    ? `/project/${fcmData.projectId}/chat`
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

const params = new URL(self.location.href).searchParams

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

firebase.messaging()
