import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

const WS_BASE_URL = 'https://api.umc-plog.site'

// destination 출처: 백엔드 API 명세서(Notion) — Swagger는 REST만 다뤄서 별도 확인받음
export const chatDestinations = {
  subscribeRoom: (roomId: number) => `/topic/chat-rooms/${roomId}`,
  subscribeAttachments: (roomId: number) => `/topic/chat-rooms/${roomId}/attachments`,
  subscribeErrors: () => '/user/queue/errors',
  subscribeChatUpdate: () => '/user/queue/chat-update',
  publishMessage: (roomId: number) => `/app/chat-rooms/${roomId}/messages`,
}

/** 본인이 읽음 처리했을 때 — 다른 기기/탭의 안읽음 배지를 맞추기 위해 온다 */
export interface ChatReadUpdateEvent {
  type: 'READ_UPDATE'
  roomId: number
  lastReadMessageSequence: number
  unreadMessageCount: number
}

/** 다른 사람이 새 메시지를 보냈을 때 — 발신자를 제외한 방 참여자 전원에게 온다 */
export interface ChatRoomSummaryEvent {
  type: 'ROOM_SUMMARY'
  roomId: number
  messageSequence: number
  /** 텍스트면 그대로(최대 100자+…), 첨부만 있으면 파일명("회의록.pdf 외 1개") */
  latestMessage: string
  unreadMessageCount: number
}

// 두 이벤트가 같은 채널(/user/queue/chat-update)로 오므로 type으로 분기해야 한다.
// 유니온으로 두면 분기 누락 시 타입 에러로 잡힌다.
export type ChatUpdateEvent = ChatReadUpdateEvent | ChatRoomSummaryEvent

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
