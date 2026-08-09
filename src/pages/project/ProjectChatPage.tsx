import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { Client } from '@stomp/stompjs';
import { AlertModal } from '../../components/Modal';
import { useAuthStore } from '../../store/authStore';
import { AVATAR_PRESETS } from '../../components/AvatarPicker';
import { toAvatarId } from '../../lib/profilePreset';
import defaultProfileIcon from '../../assets/default-profile.png';
import { fetchChannels, fetchMessages, markRoomAsRead, type ChatAttachmentThumbnailResponse, type ChatChannelParticipantResponse, type ChatMessageAttachmentResponse, type ChatMessageResponse } from '../../api/chat';
import { createChatStompClient, subscribeToDestination, publishToDestination, chatDestinations } from '../../api/chatSocket';
import { ApiError, reissueAccessToken } from '../../api/client';
import { uploadFile } from '../../api/file';
import docFileIcon from '../../assets/doc-file-icon.png';

const MAX_CHAT_ATTACHMENTS = 10;
const CHAT_FILE_ACCEPT = '.pdf,.pptx,.docx,.zip,.fig,.jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif';

interface PendingChatAttachment {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: 'UPLOADING' | 'SUCCESS' | 'ERROR';
  fileKey?: string;
  error?: string;
}

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
  return id ? AVATAR_PRESETS.find((item) => item.id === id)?.src ?? defaultProfileIcon : defaultProfileIcon;
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

function AuthenticatedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const retriedRef = useRef(false);

  useEffect(() => {
    setImageSrc(src);
    retriedRef.current = false;
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (retriedRef.current) return;
        retriedRef.current = true;
        void reissueAccessToken().then((token) => {
          if (!token) return;
          const separator = src.includes('?') ? '&' : '?';
          setImageSrc(`${src}${separator}retry=${Date.now()}`);
        });
      }}
    />
  );
}

function ChatAttachment({
  attachment,
  isMine,
}: {
  attachment: ChatMessageAttachmentResponse;
  isMine: boolean;
}) {
  if (isImageFile(attachment.fileName)) {
    const imageUrl = attachment.thumbnailUrl ?? attachment.fileUrl;
    return (
      <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
        <AuthenticatedImage
          src={imageUrl}
          alt={attachment.fileName}
          className="max-h-[240px] max-w-[200px] rounded-2xl object-cover shadow-sm"
        />
      </a>
    );
  }

  return (
    <div className={`${isMine ? 'bg-primary' : 'bg-white shadow-sm'} flex w-56 items-center gap-3 rounded-2xl p-3`}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-100 bg-white p-px text-gray-400">
        <DocIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-caption font-semibold ${isMine ? 'text-gray-25' : 'text-navy-700'}`}>{attachment.fileName}</p>
        <p className={`text-caption ${isMine ? 'text-gray-25' : 'text-gray-400'}`}>{formatFileSize(attachment.fileSize)}</p>
      </div>
      <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className={`${isMine ? 'text-gray-25' : 'text-gray-400'} shrink-0`} aria-label={`${attachment.fileName} 다운로드`}>
        <DownloadIcon />
      </a>
    </div>
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
          <div className="flex max-w-xs flex-col items-start gap-1.5">
            {msg.message?.trim() && (
              <div className="rounded-bl-2xl rounded-br-2xl rounded-tl rounded-tr-2xl bg-white px-3.5 py-3 text-body-sm text-gray-900 shadow-sm">
                {renderText(msg.message, false, memberNicknames)}
              </div>
            )}
            {msg.attachments.map((attachment) => (
              <ChatAttachment key={attachment.chatAttachmentId} attachment={attachment} isMine={false} />
            ))}
          </div>
          <time dateTime={msg.createdAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.createdAt)}</time>
        </div>
      </div>
    </div>
  );
}

function MyBubble({ msg, memberNicknames }: { msg: ChatMessageResponse; memberNicknames: Set<string> }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <time dateTime={msg.createdAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.createdAt)}</time>
      <div className="flex max-w-xs flex-col items-end gap-1.5">
        {msg.message?.trim() && (
          <div className="rounded-bl-2xl rounded-br-2xl rounded-tl-2xl rounded-tr bg-primary px-3.5 py-3 text-body-sm text-gray-25">
            {renderText(msg.message, true, memberNicknames)}
          </div>
        )}
        {msg.attachments.map((attachment) => (
          <ChatAttachment key={attachment.chatAttachmentId} attachment={attachment} isMine />
        ))}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ProjectChatPage() {
  const { id: projectId = '' } = useParams<{ id: string }>();
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [memberNicknames, setMemberNicknames] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<ChatChannelParticipantResponse[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const chatPageRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const thumbnailUrlsRef = useRef(new Map<number, string>());
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
        setParticipants(channel.participants);
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
    thumbnailUrlsRef.current.clear();
    const client = createChatStompClient(
      () => {
        subscribeToDestination(client, chatDestinations.subscribeRoom(roomId), (frame) => {
          const incoming = JSON.parse(frame.body) as ChatMessageResponse;
          const hydratedIncoming = {
            ...incoming,
            attachments: incoming.attachments.map((attachment) => {
              const thumbnailUrl = thumbnailUrlsRef.current.get(attachment.chatAttachmentId);
              return thumbnailUrl
                ? { ...attachment, thumbnailUrl, thumbnailPending: false }
                : attachment;
            }),
          };
          setMessages((prev) => [...prev, hydratedIncoming]);
          markRoomAsRead(roomId, incoming.chatId).catch(() => undefined);
        });
        subscribeToDestination(client, chatDestinations.subscribeAttachments(roomId), (frame) => {
          const thumbnail = JSON.parse(frame.body) as ChatAttachmentThumbnailResponse;
          thumbnailUrlsRef.current.set(thumbnail.chatAttachmentId, thumbnail.thumbnailUrl);
          setMessages((prev) => prev.map((message) => ({
            ...message,
            attachments: message.attachments.map((attachment) =>
              attachment.chatAttachmentId === thumbnail.chatAttachmentId
                ? { ...attachment, thumbnailUrl: thumbnail.thumbnailUrl, thumbnailPending: false }
                : attachment
            ),
          })));
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
    const chatPageTop = chatPage.getBoundingClientRect().top + window.scrollY;

    const updateHeight = () => {
      // pageTop을 포함한 실제 화면 하단과 채팅 페이지 시작점 사이의 높이를 사용한다.
      // iOS Safari가 키보드 표시 중 문서를 위로 이동해도 입력창이 화면 하단에 유지된다.
      const visibleBottom = viewport.pageTop + viewport.height;
      const height = Math.max(240, visibleBottom - chatPageTop);
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
    const attachments = pendingAttachments.flatMap((attachment) =>
      attachment.status === 'SUCCESS' && attachment.fileKey
        ? [{
            fileKey: attachment.fileKey,
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
          }]
        : []
    );
    if (
      (!text && attachments.length === 0) ||
      pendingAttachments.some((attachment) => attachment.status !== 'SUCCESS') ||
      roomId === null ||
      !stompClientRef.current?.connected
    ) return;
    publishToDestination(stompClientRef.current, chatDestinations.publishMessage(roomId), {
      message: text,
      clientMessageId: crypto.randomUUID(),
      attachments,
    });
    setInput('');
    setPendingAttachments([]);
  }, [input, pendingAttachments, roomId]);

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    if (pendingAttachments.length + files.length > MAX_CHAT_ATTACHMENTS) {
      setNotice(`첨부는 최대 ${MAX_CHAT_ATTACHMENTS}개까지 추가할 수 있어요.`);
      return;
    }

    const existing = new Set(
      pendingAttachments.map((attachment) =>
        `${attachment.file.name}\u0000${attachment.file.size}\u0000${attachment.file.lastModified}`
      )
    );
    const uniqueFiles = files.filter((file) => {
      const fingerprint = `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
      if (existing.has(fingerprint)) return false;
      existing.add(fingerprint);
      return true;
    });
    if (uniqueFiles.length !== files.length) {
      setNotice('같은 파일은 중복으로 첨부할 수 없어요.');
    }

    const nextAttachments = uniqueFiles.map<PendingChatAttachment>((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'UPLOADING',
    }));
    setPendingAttachments((prev) => [...prev, ...nextAttachments]);

    for (const attachment of nextAttachments) {
      void uploadFile(attachment.file, 'CHAT')
        .then((uploaded) => {
          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'SUCCESS', fileKey: uploaded.fileKey, error: undefined }
              : item
          ));
        })
        .catch((error: unknown) => {
          const message = error instanceof ApiError
            ? error.message
            : '파일 업로드에 실패했어요.';
          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'ERROR', error: message }
              : item
          ));
          setNotice(message);
        });
    }
  }, [pendingAttachments]);

  // 커서 바로 앞의 "@단어"를 찾아 멘션 자동완성 트리거 여부를 판단한다.
  const detectMentionTrigger = (value: string, cursor: number) => {
    const beforeCursor = value.slice(0, cursor);
    const at = beforeCursor.lastIndexOf('@');
    if (at === -1) return null;
    const query = beforeCursor.slice(at + 1);
    if (/\s/.test(query)) return null;
    return { start: at, query };
  };

  const filteredMentions = mentionQuery === null
    ? []
    : participants
        .filter((p) => p.nickname.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6);

  const selectMention = (nickname: string) => {
    if (mentionStartIndex === null) return;
    const cursor = textInputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, mentionStartIndex);
    const after = input.slice(cursor);
    const inserted = `@${nickname} `;
    setInput(`${before}${inserted}${after}`);
    setMentionQuery(null);
    setMentionStartIndex(null);
    setActiveMentionIndex(0);
    requestAnimationFrame(() => {
      const el = textInputRef.current;
      if (!el) return;
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const hasUploadingAttachment = pendingAttachments.some((attachment) => attachment.status === 'UPLOADING');
  const hasAttachmentError = pendingAttachments.some((attachment) => attachment.status === 'ERROR');
  const canSend =
    (Boolean(input.trim()) || pendingAttachments.length > 0) &&
    !hasUploadingAttachment &&
    !hasAttachmentError;

  return (
    <div
      ref={chatPageRef}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-25"
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

      <div className="relative shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 z-10 mb-2 max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-1 shadow-lg">
            {filteredMentions.map((participant, index) => (
              <button
                key={participant.userId}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectMention(participant.nickname)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                  index === activeMentionIndex ? 'bg-gray-100' : ''
                }`}
              >
                <img
                  src={avatarUrl(participant.profilePreset)}
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover"
                  aria-hidden
                />
                <span className="truncate text-body-sm text-gray-900">{participant.nickname}</span>
              </button>
            ))}
          </div>
        )}
        {pendingAttachments.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {pendingAttachments.map((attachment) => (
              <div key={attachment.id} className="flex min-w-[180px] max-w-[220px] items-center gap-2 rounded-xl border border-gray-100 bg-gray-25 px-3 py-2">
                <DocIcon />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-caption font-semibold text-navy-700">{attachment.fileName}</p>
                  <p className={`text-chat-time ${attachment.status === 'ERROR' ? 'text-error' : 'text-gray-400'}`}>
                    {attachment.status === 'UPLOADING'
                      ? '업로드 중...'
                      : attachment.status === 'ERROR'
                      ? '업로드 실패'
                      : formatFileSize(attachment.fileSize)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-lg text-gray-400"
                  aria-label={`${attachment.fileName} 첨부 삭제`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
              accept={CHAT_FILE_ACCEPT}
              multiple
              className="hidden"
              aria-label="첨부할 파일 선택"
              onChange={(event) => {
                handleFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </div>

          {/* 텍스트 입력 */}
          <input
            ref={textInputRef}
            type="text"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={(e) => {
              const value = e.target.value;
              setInput(value);
              const trigger = detectMentionTrigger(value, e.target.selectionStart ?? value.length);
              setMentionStartIndex(trigger?.start ?? null);
              setMentionQuery(trigger?.query ?? null);
              setActiveMentionIndex(0);
            }}
            onKeyDown={(event) => {
              if (mentionQuery === null || filteredMentions.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveMentionIndex((prev) => (prev + 1) % filteredMentions.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                selectMention(filteredMentions[activeMentionIndex].nickname);
              } else if (event.key === 'Escape') {
                setMentionQuery(null);
                setMentionStartIndex(null);
              }
            }}
            onBlur={() => setMentionQuery(null)}
            onFocus={() => {
              window.setTimeout(() => {
                const container = messagesRef.current;
                if (container) container.scrollTop = container.scrollHeight;
              }, 100);
            }}
            data-chat-input="true"
            className="h-10 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-body-sm"
          />

          {/* 전송 버튼 */}
          <button
            type="submit"
            disabled={!canSend}
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
