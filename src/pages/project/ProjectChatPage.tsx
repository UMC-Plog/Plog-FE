import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Client } from '@stomp/stompjs';
import { cn } from '../../lib/utils';
import { AlertModal } from '../../components/Modal';
import { useAuthStore } from '../../store/authStore';
import { AVATAR_PRESETS } from '../../components/AvatarPicker';
import { toAvatarId } from '../../lib/profilePreset';
import { fetchChannels, fetchMessages, markRoomAsRead, type ChatMessageResponse } from '../../api/chat';
import { createChatStompClient, subscribeToDestination, publishToDestination, chatDestinations } from '../../api/chatSocket';
import { ApiError } from '../../api/client';
import docFileIcon from '../../assets/doc-file-icon.png';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(value));

const dateKey = (value: string) => new Date(value).toLocaleDateString('en-CA');

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const isImageFile = (fileName: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);

const avatarUrl = (preset: string | null) => {
  const id = toAvatarId(preset);
  return id ? AVATAR_PRESETS.find((item) => item.id === id)?.src ?? '' : '';
};

// ── Inline SVG icons (lucide 금지) ──────────────────────────────────────────

function DocIcon() {
  return (
    <div className="w-[14px] h-[19px] shrink-0 overflow-hidden">
      <img src={docFileIcon} alt="" className="size-full object-cover" aria-hidden />
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.66667 6.66667L8 10L11.3333 6.66667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10V2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2.01667" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageUploadIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 20.0261 20" fill="none" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.21339 0H15.8384C16.3883 0 16.9329 0.108333 17.4409 0.318812C17.949 0.529291 18.4106 0.837793 18.7994 1.2267C19.1882 1.6156 19.4966 2.07729 19.707 2.5854C19.9173 3.0935 20.0255 3.63807 20.0254 4.188V15.813C20.0254 16.3629 19.9171 16.9075 19.7066 17.4155C19.4961 17.9236 19.1876 18.3852 18.7987 18.774C18.4098 19.1628 17.9481 19.4712 17.44 19.6816C16.9319 19.8919 16.3873 20.0001 15.8374 20H4.21339C3.66338 20.0001 3.11873 19.8919 2.61056 19.6815C2.10238 19.4711 1.64065 19.1626 1.25173 18.7737C0.862815 18.3847 0.554334 17.923 0.343913 17.4148C0.133493 16.9067 0.0252572 16.362 0.0253886 15.812V4.188C0.0259186 3.07744 0.467323 2.01251 1.25261 1.22722C2.0379 0.441935 3.10282 0.000529976 4.21339 0ZM4.21339 2C3.00439 2 2.02539 2.98 2.02539 4.188V15.813C2.02539 17.02 3.00539 18 4.21339 18H15.8384C17.0454 18 18.0254 17.02 18.0254 15.812V4.188C18.0254 2.98 17.0454 2 15.8374 2H4.21339Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.2654 8.924C15.0541 8.74747 14.7881 8.64968 14.5127 8.64731C14.2374 8.64494 13.9697 8.73813 13.7554 8.911L8.51139 13.158C8.14618 13.4535 7.69221 13.6177 7.22245 13.624C6.75269 13.6304 6.29445 13.4786 5.92139 13.193L4.53639 12.133C4.51856 12.1194 4.49646 12.1127 4.4741 12.114C4.45173 12.1153 4.43055 12.1245 4.41439 12.14L1.71639 14.722C1.6227 14.8182 1.5106 14.8945 1.38677 14.9465C1.26294 14.9984 1.12992 15.0249 0.995639 15.0243C0.86136 15.0237 0.728575 14.9961 0.605203 14.9431C0.48183 14.8901 0.370399 14.8127 0.277554 14.7157C0.184709 14.6187 0.112353 14.504 0.0648011 14.3784C0.0172495 14.2528 -0.00452361 14.119 0.000780481 13.9848C0.00608458 13.8506 0.0383572 13.7189 0.0956735 13.5975C0.15299 13.476 0.234176 13.3674 0.334389 13.278L3.03139 10.695C3.39241 10.3494 3.86513 10.1443 4.36415 10.1168C4.86317 10.0893 5.35557 10.2412 5.75239 10.545L7.13739 11.605C7.15405 11.6178 7.17453 11.6247 7.19556 11.6245C7.21659 11.6243 7.23695 11.6171 7.25339 11.604L12.4954 7.357C13.0701 6.892 13.7885 6.64106 14.5278 6.64708C15.2671 6.6531 15.9813 6.9157 16.5484 7.39L19.6684 10.003C19.8717 10.1734 19.9989 10.4176 20.0222 10.6818C20.0455 10.9461 19.9628 11.2087 19.7924 11.412C19.622 11.6153 19.3778 11.7426 19.1136 11.7658C18.8493 11.7891 18.5867 11.7064 18.3834 11.536L15.2654 8.924Z"
        fill="currentColor"
      />
      <path
        d="M8.30639 6.64C8.30639 7.07496 8.1336 7.4921 7.82604 7.79965C7.51848 8.10721 7.10134 8.28 6.66639 8.28C6.23143 8.28 5.81429 8.10721 5.50673 7.79965C5.19917 7.4921 5.02639 7.07496 5.02639 6.64C5.02639 6.20505 5.19917 5.7879 5.50673 5.48034C5.81429 5.17279 6.23143 5 6.66639 5C7.10134 5 7.51848 5.17279 7.82604 5.48034C8.1336 5.7879 8.30639 6.20505 8.30639 6.64Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 멘션 파싱 (@닉네임이 실제 프로젝트 멤버와 일치할 때만 강조) ──────────────

function renderText(text: string, isMine: boolean, memberNicknames: Set<string>) {
  return text.split(/(@\S+)/g).map((part, i) => {
    const isRealMention = part.startsWith('@') && memberNicknames.has(part.slice(1));
    return isRealMention ? (
      <span key={i} className={isMine ? 'text-primary-200' : 'text-primary'}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

// ── 말풍선 컴포넌트 ──────────────────────────────────────────────────────────

function OtherBubble({ msg, memberNicknames }: { msg: ChatMessageResponse; memberNicknames: Set<string> }) {
  const attachment = msg.attachments[0];
  return (
    <div className="flex items-start gap-2">
      <img
        src={avatarUrl(msg.profilePreset)}
        alt={msg.senderNickname}
        className="size-9 rounded-full shrink-0 object-cover"
      />
      <div className="flex flex-col gap-1">
        <span className="text-caption text-gray-500">{msg.senderNickname}</span>
        <div className="flex items-end gap-2">
          {!attachment ? (
            <div className="bg-white shadow-sm rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-3.5 py-3 text-body-sm text-gray-900 max-w-xs">
              {renderText(msg.message, false, memberNicknames)}
            </div>
          ) : isImageFile(attachment.fileName) ? (
            <img
              src={attachment.fileUrl}
              alt={attachment.fileName}
              className="max-w-[200px] max-h-[240px] rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm object-cover"
            />
          ) : (
            <div className="bg-white shadow-sm rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3 flex items-center gap-3 w-56">
              <div className="size-9 bg-white border border-gray-100 p-px rounded-md flex items-center justify-center text-gray-400 shrink-0">
                <DocIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-semibold text-navy-700 truncate">{attachment.fileName}</p>
                <p className="text-caption text-gray-400">{formatFileSize(attachment.fileSize)}</p>
              </div>
              <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 shrink-0" aria-label={`${attachment.fileName} 다운로드`}>
                <DownloadIcon />
              </a>
            </div>
          )}
          <time dateTime={msg.createdAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.createdAt)}</time>
        </div>
      </div>
    </div>
  );
}

function MyBubble({ msg, memberNicknames }: { msg: ChatMessageResponse; memberNicknames: Set<string> }) {
  const attachment = msg.attachments[0];
  return (
    <div className="flex items-end justify-end gap-2">
      <time dateTime={msg.createdAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.createdAt)}</time>
      {!attachment ? (
        <div className="bg-primary rounded-tl-2xl rounded-tr rounded-br-2xl rounded-bl-2xl px-3.5 py-3 text-body-sm text-gray-25 max-w-xs">
          {renderText(msg.message, true, memberNicknames)}
        </div>
      ) : isImageFile(attachment.fileName) ? (
        <img
          src={attachment.fileUrl}
          alt={attachment.fileName}
          className="max-w-[200px] max-h-[240px] rounded-tl-2xl rounded-tr rounded-br-2xl rounded-bl-2xl shadow-sm object-cover"
        />
      ) : (
        <div className="bg-primary rounded-tl-2xl rounded-tr rounded-br-2xl rounded-bl-2xl p-3 flex items-center gap-3 w-56">
          <div className="size-9 bg-white border border-gray-100 p-px rounded-md flex items-center justify-center shrink-0">
            <DocIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption font-semibold text-gray-25 truncate">{attachment.fileName}</p>
            <p className="text-caption text-gray-25">{formatFileSize(attachment.fileSize)}</p>
          </div>
          <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-25 shrink-0" aria-label={`${attachment.fileName} 다운로드`}>
            <DownloadIcon />
          </a>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ProjectChatPage() {
  const { id: projectId = '' } = useParams<{ id: string }>();
  const [input, setInput] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [memberNicknames, setMemberNicknames] = useState<Set<string>>(new Set());
  const [roomId, setRoomId] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const myNickname = useAuthStore((s) => s.user?.nickname);

  // 채팅방 목록에서 현재 프로젝트에 해당하는 roomId/참여자 조회 (프로젝트별 단건 조회 API가 없음)
  useEffect(() => {
    const numericProjectId = Number(projectId);
    if (!Number.isFinite(numericProjectId)) return;
    let cancelled = false;
    fetchChannels({ size: 100 })
      .then((res) => {
        if (cancelled) return;
        const channel = res.content.find((c) => c.projectId === numericProjectId);
        if (!channel) {
          setNotice('채팅방을 찾을 수 없어요.');
          return;
        }
        setRoomId(channel.roomId);
        setMemberNicknames(new Set(channel.participants.map((p) => p.nickname)));
      })
      .catch(() => {
        if (!cancelled) setNotice('채팅방 정보를 불러오지 못했어요. 다시 시도해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // roomId가 확정되면 메시지 이력 조회 + 읽음 처리
  useEffect(() => {
    if (roomId === null) return;
    let cancelled = false;
    fetchMessages(roomId, { size: 30 })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
        const last = res.messages[res.messages.length - 1];
        if (last) markRoomAsRead(roomId, last.chatId).catch(() => undefined);
      })
      .catch((err) => {
        if (!cancelled) setNotice(err instanceof ApiError ? err.message : '메시지를 불러오지 못했어요. 다시 시도해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // roomId가 확정되면 STOMP 연결 + 실시간 구독
  useEffect(() => {
    if (roomId === null) return;
    const client = createChatStompClient(
      () => {
        subscribeToDestination(client, chatDestinations.subscribeRoom(roomId), (frame) => {
          const incoming = JSON.parse(frame.body) as ChatMessageResponse;
          setMessages((prev) => [...prev, incoming]);
          markRoomAsRead(roomId, incoming.chatId).catch(() => undefined);
        });
        subscribeToDestination(client, chatDestinations.subscribeErrors(), (frame) => {
          setNotice(frame.body || '메시지 전송 중 오류가 발생했어요.');
        });
      },
      () => setNotice('실시간 연결에 실패했어요. 새로고침 후 다시 시도해 주세요.')
    );
    client.activate();
    stompClientRef.current = client;
    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!showPopup) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsidePopup = !popupRef.current?.contains(target);
      const outsideTrigger = !triggerRef.current?.contains(target);
      if (outsidePopup && outsideTrigger) setShowPopup(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || roomId === null || !stompClientRef.current?.connected) return;
    publishToDestination(stompClientRef.current, chatDestinations.publishMessage(roomId), { message: text });
    setInput('');
  }, [input, roomId]);

  const handleFile = (file?: File) => {
    if (!file) return;
    setNotice('파일 첨부는 곧 지원 예정이에요.');
    setShowPopup(false);
  };

  return (
    <div className="bg-gray-25 min-h-[calc(100svh-theme(spacing.12)-theme(spacing.10))]">
      {/* 메시지 목록 — 하단 입력창 높이만큼 pb 확보 */}
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        {messages.map((message, index) => {
          const showDate = index === 0 || dateKey(messages[index - 1].createdAt) !== dateKey(message.createdAt);
          const isMine = message.senderNickname === myNickname;
          return (
            <Fragment key={message.chatId}>
              {showDate && (
                <div className="flex justify-center">
                  <span className="bg-gray-100 rounded-full px-3 py-1 text-caption text-gray-400">{formatDate(message.createdAt)}</span>
                </div>
              )}
              {isMine
                ? <MyBubble msg={message} memberNicknames={memberNicknames} />
                : <OtherBubble msg={message} memberNicknames={memberNicknames} />}
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} className="h-px scroll-mb-28" aria-hidden />
      </div>

      {/* 하단 입력창 — fixed, BottomTabBar 패턴과 동일하게 left-1/2 -translate-x-1/2 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile border-t border-gray-100 bg-white px-4 pt-3 pb-8">
        <form
          className="flex items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          {/* 첨부 팝업 + 트리거 버튼 */}
          <div className="relative shrink-0">
            {showPopup && (
              <div
                ref={popupRef}
                className={cn(
                  'absolute bottom-full left-0 mb-2 z-20',
                  'w-40 bg-gray-25 border border-gray-200 rounded-2xl shadow-md overflow-hidden',
                )}
              >
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-body-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200"
                >
                  <ImageUploadIcon className="text-primary shrink-0" />
                  이미지 업로드
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-body-sm text-gray-900 hover:bg-gray-50"
                >
                  <PaperclipIcon className="text-primary shrink-0" />
                  파일 업로드
                </button>
              </div>
            )}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setShowPopup((v) => !v)}
              className={cn(
                'size-8 shrink-0 aspect-square flex items-center justify-center transition-colors',
                showPopup ? 'text-primary' : 'text-gray-400',
              )}
              aria-label="첨부파일"
            >
              <PlusIcon />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
            <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.target.value = ''; }} />
          </div>

          {/* 텍스트 입력 */}
          <input
            type="text"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-body-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />

          {/* 전송 버튼 */}
          <button
            type="submit"
            disabled={!input.trim()}
            className="size-10 bg-primary rounded-md flex items-center justify-center shrink-0 text-gray-25 hover:bg-primary-600 disabled:bg-gray-200 disabled:hover:bg-gray-200 transition-colors"
            aria-label="전송"
          >
            <SendIcon />
          </button>
        </form>
      </div>

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
