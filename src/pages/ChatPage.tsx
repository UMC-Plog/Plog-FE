import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatListItem, { type ChatParticipant } from '../components/ChatListItem';
import { PlogIcon } from '../components/PlogIcon';
import { AVATAR_PRESETS } from '../components/AvatarPicker';
import { cn } from '../lib/utils';
import { useChatStore } from '../store/chatStore';

interface ChatRoom {
  id: string;
  projectName: string;
  participants: ChatParticipant[];
  lastSenderName: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

// AVATAR_PRESETS에서 avatarUrl을 가져오는 헬퍼
const av = (id: string): string =>
  AVATAR_PRESETS.find((a) => a.id === id)?.src ?? '';

// Figma 예시 데이터 기준 — avatarUrl을 실제 이미지로 연결
const MOCK_CHATS: ChatRoom[] = [
  {
    id: 'project-test',
    projectName: '테스트 프로젝트',
    participants: [
      { id: 'u1', name: '곰곰', avatarUrl: av('otter') },
      { id: 'u2', name: '다람쥐', avatarUrl: av('penguin') },
      { id: 'u3', name: '호랑이', avatarUrl: av('tiger') },
      { id: 'u4', name: '여우', avatarUrl: av('frog') },
    ],
    lastSenderName: '곰곰',
    lastMessage: 'API PR 리뷰 부탁드려요!',
    time: '방금',
    unreadCount: 3,
  },
  {
    id: 'project-marketing-campaign',
    projectName: '마케팅 캠페인',
    participants: [
      { id: 'u1', name: '곰곰', avatarUrl: av('otter') },
      { id: 'u3', name: '호랑이', avatarUrl: av('tiger') },
      { id: 'u5', name: '공룡', avatarUrl: av('koala') },
    ],
    lastSenderName: '공룡',
    lastMessage: '내일 회의 10시로 변경 가능할까요?',
    time: '1시간 전',
    unreadCount: 0,
  },
  {
    id: 'project-capstone-design',
    projectName: '캡스톤 디자인 2팀',
    participants: [
      { id: 'u1', name: '곰곰', avatarUrl: av('otter') },
      { id: 'u2', name: '다람쥐', avatarUrl: av('penguin') },
      { id: 'u6', name: '체리', avatarUrl: av('smile') },
    ],
    lastSenderName: '체리',
    lastMessage: '수고하셨습니다!',
    time: '어제',
    unreadCount: 0,
  },
];

export default function ChatPage() {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const messagesByProject = useChatStore((state) => state.messagesByProject);
  const lastReadAtByProject = useChatStore((state) => state.lastReadAtByProject);

  const chats = useMemo(() => MOCK_CHATS.map((chat) => {
    const messages = messagesByProject[chat.id] ?? [];
    const latest = messages[messages.length - 1];
    if (!latest) return chat;
    const lastReadAt = lastReadAtByProject[chat.id];
    const unreadCount = messages.filter(
      (message) => !message.isMine && (!lastReadAt || new Date(message.sentAt) > new Date(lastReadAt)),
    ).length;
    return {
      ...chat,
      lastSenderName: latest.isMine ? '나' : latest.sender.name,
      lastMessage: latest.type === 'text' ? latest.text : latest.fileName,
      time: new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(latest.sentAt)),
      unreadCount,
    };
  }), [messagesByProject, lastReadAtByProject]);

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
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="size-10 text-gray-300 mb-3" />
            <p className="text-title text-gray-500">검색 결과가 없어요</p>
            <p className="mt-1 text-body-sm text-gray-400">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.id}
              projectName={chat.projectName}
              participants={chat.participants}
              lastSenderName={chat.lastSenderName}
              lastMessage={chat.lastMessage}
              time={chat.time}
              unreadCount={chat.unreadCount}
              onClick={() => navigate(`/project/${chat.id}/chat`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
