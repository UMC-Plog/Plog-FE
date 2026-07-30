import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

const WS_BASE_URL = 'https://api.umc-plog.site'

// destination 출처: 백엔드 API 명세서(Notion) — Swagger는 REST만 다뤄서 별도 확인받음
export const chatDestinations = {
  subscribeRoom: (roomId: number) => `/topic/chat-rooms/${roomId}`,
  subscribeErrors: () => '/user/queue/errors',
  publishMessage: (roomId: number) => `/app/chat-rooms/${roomId}/messages`,
}

export function createChatStompClient(onConnect: () => void, onError?: (error: unknown) => void): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws-stomp`),
    connectHeaders: {
      Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}`,
    },
    reconnectDelay: 5000,
    onConnect,
    onStompError: (frame) => onError?.(frame),
    onWebSocketError: (event) => onError?.(event),
  })

  return client
}

export function subscribeToDestination(
  client: Client,
  destination: string,
  onMessage: (message: IMessage) => void
): StompSubscription {
  return client.subscribe(destination, onMessage)
}

export function publishToDestination(client: Client, destination: string, body: unknown): void {
  client.publish({ destination, body: JSON.stringify(body) })
}
