import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// 백엔드 STOMP 엔드포인트: /ws-stomp (.withSockJS() 적용됨) → 프론트도 SockJS로 연결
// TODO: 백엔드에서 아래 정보 확정되면 반영
// - 채팅방 구독(subscribe) destination 형식
// - 메시지 전송(publish) destination
// - 메시지 payload 형식
// - STOMP CONNECT 시 인증 헤더 필요 여부
const WS_BASE_URL = 'https://api.umc-plog.site' // 임시값, VITE_API_BASE_URL 확정되면 교체

export function createChatStompClient(onConnect: () => void, onError?: (error: unknown) => void): Client {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws-stomp`),
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
