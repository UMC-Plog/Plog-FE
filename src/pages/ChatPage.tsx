import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatListItem, { type ChatParticipant } from '../components/ChatListItem';
import { PlogIcon } from '../components/PlogIcon';
import { AlertModal } from '../components/Modal';
import { cn } from '../lib/utils';
import { fetchChannels, type ChatChannelResponse } from '../api/chat';
import { AVATAR_PRESETS } from '../components/AvatarPicker';
import { toAvatarId } from '../lib/profilePreset';

interface ChatRoom {
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

function toChatRoom(channel: ChatChannelResponse): ChatRoom {
  return {
    projectId: channel.projectId,
    projectName: channel.projectName,
    participants: channel.participants.map((p) => ({
      id: String(p.userId),
      name: p.nickname,
      avatarUrl: avatarUrl(p.profilePreset),
    })),
    lastMessage: channel.latestMessage ?? '아직 메시지가 없어요',
    time: channel.latestMessageAt
      ? new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(channel.latestMessageAt))
      : '',
    unreadCount: channel.unreadMessageCount,
  };
}

export default function ChatPage() {
  const [keyword, setKeyword] = useState('');
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchChannels({ size: 100 })
      .then((res) => {
        if (!cancelled) setChats(res.content.map(toChatRoom));
      })
      .catch(() => {
        if (!cancelled) setNotice('채팅방 목록을 불러오지 못했어요. 다시 시도해 주세요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
