import { cn } from '../lib/utils';

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatListItemProps {
  projectName: string;
  participants: ChatParticipant[]; // 2~4명
  lastSenderName: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  onClick?: () => void;
}

// Figma CSS Grid 방식 재현: 모든 아바타를 col-start-1 row-start-1에 배치 후 ml/mt로 위치 조정
// 아바타 크기: size-6 (24px), 오프셋: ml-7/mt-7 (28px = Tailwind 기본 7단위)
const GRID_POSITIONS: Record<number, Array<{ ml: string; mt: string }>> = {
  2: [
    { ml: '', mt: '' },
    { ml: 'ml-7', mt: 'mt-7' },
  ],
  3: [
    { ml: '', mt: '' },
    { ml: 'ml-3.5', mt: 'mt-7' }, // 14px (Tailwind 기본 3.5단위)
    { ml: 'ml-7', mt: '' },
  ],
  4: [
    { ml: '', mt: '' },
    { ml: '', mt: 'mt-7' },
    { ml: 'ml-7', mt: 'mt-7' },
    { ml: 'ml-7', mt: '' },
  ],
};

function AvatarItem({
  participant,
  ml,
  mt,
}: {
  participant: ChatParticipant;
  ml: string;
  mt: string;
}) {
  const base = cn(
    'col-start-1 row-start-1 size-6 rounded-md shrink-0',
    ml,
    mt,
  );
  if (participant.avatarUrl) {
    return (
      <img
        src={participant.avatarUrl}
        alt={participant.name}
        className={cn(base, 'object-cover')}
      />
    );
  }
  return (
    <div
      className={cn(
        base,
        'flex items-center justify-center bg-primary-100 text-primary-700 text-caption font-semibold',
      )}
    >
      {participant.name[0]}
    </div>
  );
}

function AvatarGrid({ participants }: { participants: ChatParticipant[] }) {
  const count = Math.min(Math.max(participants.length, 2), 4) as 2 | 3 | 4;
  const positions = GRID_POSITIONS[count];
  return (
    <div className="inline-grid place-items-start shrink-0">
      {positions.map((pos, i) => (
        <AvatarItem
          key={participants[i]?.id ?? i}
          participant={participants[i] ?? { id: String(i), name: '?' }}
          ml={pos.ml}
          mt={pos.mt}
        />
      ))}
    </div>
  );
}

export default function ChatListItem({
  projectName,
  participants,
  lastSenderName,
  lastMessage,
  time,
  unreadCount = 0,
  onClick,
}: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-5 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* 겹친 아바타 그리드 (Figma: inline-grid + col-start-1 row-start-1) */}
      <AvatarGrid participants={participants} />

      {/* 프로젝트명 + 마지막 메시지 */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <span className="text-body font-semibold text-gray-900 truncate">
          {projectName}
        </span>
        <p className="text-body-sm text-gray-400 truncate">
          {lastSenderName ? `${lastSenderName}: ${lastMessage}` : lastMessage}
        </p>
      </div>

      {/* 시간 + 안읽음 뱃지 */}
      <div className="flex flex-col items-end gap-3 shrink-0">
        <span className="text-caption text-gray-300">{time}</span>
        {unreadCount > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-error text-gray-25 text-caption flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
