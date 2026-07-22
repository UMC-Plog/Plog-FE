import { Fragment, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AlertModal } from '../../components/Modal';
import { useChatStore } from '../../store/chatStore';
import type { ChatMessage } from '../../types/chat';

type MessageItem = ChatMessage;

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(value));

const dateKey = (value: string) => new Date(value).toLocaleDateString('en-CA');

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// ── Inline SVG icons (lucide 금지) ──────────────────────────────────────────

function DocIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path d="M11.5 2H6C5.4 2 5 2.4 5 3v14c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V7.5L11.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 2v5.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5v7M4.5 6l2.5 2.5L9.5 6M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
      <path d="M3 16.5L7.5 12l3.5 3.5 3.5-3.5L21 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// ── 멘션 파싱 (@단어 → text-primary) ────────────────────────────────────────

function renderText(text: string, isMine: boolean) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className={isMine ? 'text-primary-200' : 'text-primary'}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── 말풍선 컴포넌트 ──────────────────────────────────────────────────────────

function OtherBubble({ msg, onDownload }: { msg: MessageItem; onDownload: (message: MessageItem) => void }) {
  return (
    <div className="flex items-start gap-2">
      <img
        src={msg.sender.avatarUrl}
        alt={msg.sender.name}
        className="size-9 rounded-full shrink-0 object-cover"
      />
      <div className="flex flex-col gap-1">
        <span className="text-caption text-gray-500">{msg.sender.name}</span>
        <div className="flex items-end gap-2">
          {msg.type === 'text' ? (
            <div className="bg-white shadow-sm rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-3.5 py-3 text-body-sm text-gray-900 max-w-xs">
              {renderText(msg.text, false)}
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-tl rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-3 flex items-center gap-3 w-56">
              <div className="size-9 bg-white border border-gray-100 rounded-md flex items-center justify-center text-gray-400 shrink-0">
                <DocIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-semibold text-navy-700 truncate">{msg.fileName}</p>
                <p className="text-caption text-gray-400">{msg.fileSize}</p>
              </div>
              <button type="button" onClick={() => onDownload(msg)} className="text-gray-400 shrink-0" aria-label={`${msg.fileName} 다운로드`}>
                <DownloadIcon />
              </button>
            </div>
          )}
          <time dateTime={msg.sentAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.sentAt)}</time>
        </div>
      </div>
    </div>
  );
}

function MyBubble({ msg, onDownload }: { msg: MessageItem; onDownload: (message: MessageItem) => void }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <time dateTime={msg.sentAt} className="shrink-0 text-chat-time text-gray-400">{formatTime(msg.sentAt)}</time>
      {msg.type === 'text' ? (
        <div className="bg-primary rounded-tl-2xl rounded-tr rounded-br-2xl rounded-bl-2xl px-3.5 py-3 text-body-sm text-gray-25 max-w-xs">
          {renderText(msg.text, true)}
        </div>
      ) : (
        <div className="bg-primary rounded-tl-2xl rounded-tr rounded-br-2xl rounded-bl-2xl p-3 flex items-center gap-3 w-56">
          <div className="size-9 bg-white/20 rounded-md flex items-center justify-center text-gray-25 shrink-0">
            <DocIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption font-semibold text-gray-25 truncate">{msg.fileName}</p>
            <p className="text-caption text-gray-25">{msg.fileSize}</p>
          </div>
          <button type="button" onClick={() => onDownload(msg)} className="text-gray-25 shrink-0" aria-label={`${msg.fileName} 다운로드`}>
            <DownloadIcon />
          </button>
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useChatStore((state) => state.messagesByProject[projectId] ?? []);
  const sendText = useChatStore((state) => state.sendText);
  const sendFile = useChatStore((state) => state.sendFile);
  const markAsRead = useChatStore((state) => state.markAsRead);

  useEffect(() => {
    if (!projectId) return;
    markAsRead(projectId);
  }, [projectId, markAsRead, messages.length]);

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

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    if (!projectId) return;
    sendText(projectId, text);
    setInput('');
  };

  const handleFile = (file?: File) => {
    if (!file || !projectId) return;
    if (file.size > 2 * 1024 * 1024) {
      setNotice('데모에서는 2MB 이하 파일만 첨부할 수 있어요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      sendFile(projectId, {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        mimeType: file.type || 'application/octet-stream',
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.onerror = () => setNotice('파일을 읽지 못했어요. 다시 시도해 주세요.');
    reader.readAsDataURL(file);
    setShowPopup(false);
  };

  const handleDownload = (message: MessageItem) => {
    if (message.type !== 'file') return;
    if (!message.dataUrl) {
      setNotice('목업 파일은 실제 원본이 없어 다운로드할 수 없어요.');
      return;
    }
    const link = document.createElement('a');
    link.href = message.dataUrl;
    link.download = message.fileName;
    link.click();
  };

  return (
    <div className="bg-gray-25 min-h-full">
      {/* 메시지 목록 — 하단 입력창 높이만큼 pb 확보 */}
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        {messages.map((message, index) => {
          const showDate = index === 0 || dateKey(messages[index - 1].sentAt) !== dateKey(message.sentAt);
          return (
            <Fragment key={message.id}>
              {showDate && (
                <div className="flex justify-center">
                  <span className="bg-gray-100 rounded-full px-3 py-1 text-caption text-gray-400">{formatDate(message.sentAt)}</span>
                </div>
              )}
              {message.isMine
                ? <MyBubble msg={message} onDownload={handleDownload} />
                : <OtherBubble msg={message} onDownload={handleDownload} />}
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
              className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
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
            className="size-10 bg-primary rounded-md flex items-center justify-center shrink-0 text-gray-25 hover:bg-primary-600 transition-colors"
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
