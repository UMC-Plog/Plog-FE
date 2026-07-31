import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Client } from '@stomp/stompjs';
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
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [memberNicknames, setMemberNicknames] = useState<Set<string>>(new Set());
  const [roomId, setRoomId] = useState<number | null>(null);
  const chatPageRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const container = messagesRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // 모바일 키보드는 layout viewport가 아닌 visual viewport만 줄이는 브라우저가 있어
  // 실제 보이는 높이를 채팅 컨테이너에 반영한다. 입력창을 fixed로 두지 않고 같은 flex
  // 레이아웃에 포함해 키보드가 열려도 +/입력/전송 버튼이 한 줄로 유지되게 한다.
  useEffect(() => {
    const viewport = window.visualViewport;
    const chatPage = chatPageRef.current;
    if (!viewport || !chatPage) return;

    const updateHeight = () => {
      const top = chatPage.getBoundingClientRect().top;
      const visibleTop = viewport.offsetTop;
      const height = Math.max(240, viewport.height - Math.max(0, top - visibleTop));
      chatPage.style.height = `${height}px`;

      if (document.activeElement?.getAttribute('data-chat-input') === 'true') {
        requestAnimationFrame(() => {
          const container = messagesRef.current;
          if (container) container.scrollTop = container.scrollHeight;
        });
      }
    };

    updateHeight();
    viewport.addEventListener('resize', updateHeight);
    viewport.addEventListener('scroll', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    return () => {
      viewport.removeEventListener('resize', updateHeight);
      viewport.removeEventListener('scroll', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      chatPage.style.removeProperty('height');
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || roomId === null || !stompClientRef.current?.connected) return;
    publishToDestination(stompClientRef.current, chatDestinations.publishMessage(roomId), {
      message: text,
      clientMessageId: crypto.randomUUID(),
    });
    setInput('');
  }, [input, roomId]);

  const handleFile = (file?: File) => {
    if (!file) return;
    setNotice('파일 첨부는 곧 지원 예정이에요.');
  };

  return (
    <div
      ref={chatPageRef}
      className="flex h-[calc(100dvh-92px)] min-h-0 flex-col overflow-hidden bg-gray-25"
    >
      <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="flex flex-col gap-4">
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
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <form
          className="flex min-w-0 items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-8 aspect-square shrink-0 items-center justify-center text-gray-400 transition-colors active:text-primary"
              aria-label="첨부파일"
            >
              <PlusIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              className="hidden"
              aria-label="첨부할 파일 선택"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>

          {/* 텍스트 입력 */}
          <input
            type="text"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              window.setTimeout(() => {
                const container = messagesRef.current;
                if (container) container.scrollTop = container.scrollHeight;
              }, 100);
            }}
            data-chat-input="true"
            className="h-10 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-body-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
