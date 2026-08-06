import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatListItem, { type ChatParticipant } from '../components/ChatListItem';
import { PlogIcon } from '../components/PlogIcon';
import { AlertModal } from '../components/Modal';
import { cn } from '../lib/utils';
import { fetchChannels, type ChatChannelResponse } from '../api/chat';
import {
  chatDestinations,
  createChatStompClient,
  subscribeToDestination,
  type ChatUpdateEvent,
} from '../api/chatSocket';
import { AVATAR_PRESETS } from '../components/AvatarPicker';
import { toAvatarId } from '../lib/profilePreset';

interface ChatRoom {
  roomId: number;
  projectId: number;
  projectName: string;
  participants: ChatParticipant[];
  lastMessage: string;
  time: string;
  unreadCount: number;
}

const avatarUrl = (preset: string | null) => {
  const id = toAvatarId(preset);
  return id ? AVATAR_PRESETS.find((item) => item.id === id)?.src ?? '' : '';
};

const formatTime = (value: Date) =>
  new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value);

function toChatRoom(channel: ChatChannelResponse): ChatRoom {
  return {
    roomId: channel.roomId,
    projectId: channel.projectId,
    projectName: channel.projectName,
    participants: channel.participants.map((p) => ({
      id: String(p.userId),
      name: p.nickname,
      avatarUrl: avatarUrl(p.profilePreset),
    })),
    lastMessage: channel.latestMessage ?? '아직 메시지가 없어요',
    time: channel.latestMessageAt ? formatTime(new Date(channel.latestMessageAt)) : '',
    unreadCount: channel.unreadMessageCount,
  };
}

export default function ChatPage() {
  const [keyword, setKeyword] = useState('');
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  // chat-update push는 비동기+재시도로 발송돼 도착 순서가 보장되지 않는다.
  // 방별로 마지막 반영 sequence를 들고 있다가 더 큰 값일 때만 갱신해, 늦게 도착한
  // 예전 이벤트가 최신 상태를 과거 값으로 되돌리는 것을 막는다.
  // messageSequence(새 메시지)와 lastReadMessageSequence(읽음)는 의미가 달라 따로 추적한다.
  const summarySeqRef = useRef(new Map<number, number>());
  const readSeqRef = useRef(new Map<number, number>());

  const loadChannels = useCallback((background: boolean) => {
    let cancelled = false;
    if (!background) setLoading(true);
    fetchChannels({ size: 100 })
      .then((res) => {
        if (!cancelled) setChats(res.content.map(toChatRoom));
      })
      .catch(() => {
        // 포그라운드 push로 트리거된 재조회 실패는 목록이 이미 떠있는 화면을
        // 방해하지 않도록 조용히 무시하고, 최초 진입 실패일 때만 안내한다.
        if (!cancelled && !background) setNotice('채팅방 목록을 불러오지 못했어요. 다시 시도해 주세요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = loadChannels(false);
    return cancel;
  }, [loadChannels]);

  // 채팅 알림 push를 받으면(포그라운드) 목록을 다시 불러와 마지막 메시지/안읽음 배지를 최신화한다.
  // 아래 STOMP 구독이 주 경로이고, 이건 백그라운드에서 복귀했을 때를 위한 보조 경로다.
  useEffect(() => {
    const refresh = () => loadChannels(true);
    window.addEventListener('plog:notification-received', refresh);
    return () => window.removeEventListener('plog:notification-received', refresh);
  }, [loadChannels]);

  const applyChatUpdate = useCallback((event: ChatUpdateEvent) => {
    if (event.type === 'ROOM_SUMMARY') {
      const lastSeq = summarySeqRef.current.get(event.roomId);
      if (lastSeq !== undefined && event.messageSequence <= lastSeq) return;
      summarySeqRef.current.set(event.roomId, event.messageSequence);
      // payload에 발송 시각이 없어 수신 시각으로 표시한다. 분 단위 표시라 오차는 드러나지 않고,
      // 화면에 다시 진입하면 서버의 latestMessageAt으로 교정된다.
      const receivedAt = formatTime(new Date());
      setChats((prev) =>
        prev.map((chat) =>
          chat.roomId === event.roomId
            ? {
                ...chat,
                lastMessage: event.latestMessage,
                unreadCount: event.unreadMessageCount,
                time: receivedAt,
              }
            : chat
        )
      );
      return;
    }

    const lastReadSeq = readSeqRef.current.get(event.roomId);
    if (lastReadSeq !== undefined && event.lastReadMessageSequence <= lastReadSeq) return;
    readSeqRef.current.set(event.roomId, event.lastReadMessageSequence);
    setChats((prev) =>
      prev.map((chat) =>
        chat.roomId === event.roomId ? { ...chat, unreadCount: event.unreadMessageCount } : chat
      )
    );
  }, []);

  // 채팅방 밖에서도 목록이 실시간으로 갱신되도록 사용자 전용 큐를 구독한다.
  // 채팅방 내부(ProjectChatPage)는 /topic/chat-rooms/{roomId}로 메시지를 직접 받으므로 별개다.
  useEffect(() => {
    const client = createChatStompClient(
      () => {
        subscribeToDestination(client, chatDestinations.subscribeChatUpdate(), (frame) => {
          try {
            applyChatUpdate(JSON.parse(frame.body) as ChatUpdateEvent);
          } catch {
            // 형식이 어긋난 프레임 하나 때문에 목록 화면이 깨지지 않도록 무시한다
          }
        });
      },
      // 실시간 갱신이 안 되더라도 목록 자체는 이미 떠 있으므로 모달로 막지 않고,
      // 원인을 추적할 수 있도록 콘솔에만 남긴다.
      (error) => console.warn('[chat] 채팅 목록 실시간 연결 실패', error)
    );
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [applyChatUpdate]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.projectName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q),
    );
  }, [chats, keyword]);

  return (
    <div className="flex flex-col min-h-full bg-gray-25">
      {/* 헤더 - Figma: h-56px, bg-gray-25, border-b gray-100 */}
      <header className="bg-gray-25 border-b border-gray-100 h-14 px-6 flex items-center">
        <div className="flex items-center gap-2">
          <PlogIcon />
          <h1 className="text-title text-gray-900">채팅</h1>
        </div>
      </header>

      {/* 검색창 - Figma: bg-white, border gray-100, h-49px≈h-12, rounded-13px≈rounded-lg, px-17px≈px-4 */}
      <div className="px-6 pt-4 pb-3">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400"
            aria-hidden
          />
          <input
            type="text"
            placeholder="채팅방 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-4 rounded-lg border border-gray-100 bg-white',
              'text-body text-gray-900 placeholder:text-gray-400',
              'focus:outline-none focus:border-primary transition-colors',
            )}
          />
        </div>
      </div>

      {/* 채팅방 리스트 - Figma: divide-y gray-200, item h-81px, px-22px≈px-6, py-16px=py-4 */}
      <div className="flex-1 bg-white divide-y divide-gray-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-body-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-title text-gray-500">아직 채팅방이 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">참여 중인 프로젝트가 생기면 여기에 표시돼요</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="size-10 text-gray-300 mb-3" />
            <p className="text-title text-gray-500">검색 결과가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.projectId}
              projectName={chat.projectName}
              participants={chat.participants}
              lastSenderName=""
              lastMessage={chat.lastMessage}
              time={chat.time}
              unreadCount={chat.unreadCount}
              onClick={() => navigate(`/project/${chat.projectId}/chat`)}
            />
          ))
        )}
      </div>

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
