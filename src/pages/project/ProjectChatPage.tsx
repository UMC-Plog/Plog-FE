import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { AVATAR_PRESETS } from '../../components/AvatarPicker';

const av = (id: string): string =>
  AVATAR_PRESETS.find((a) => a.id === id)?.src ?? '';

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

// 곰곰(bear-like) → otter (ChatPage 일관성), 포도(grape) → koala, 나 → panda
const ME_USER: User = { id: 'me', name: '나', avatarUrl: av('panda') };
const GOMGOM: User = { id: 'gomgom', name: '곰곰', avatarUrl: av('otter') };
const PODO: User = { id: 'podo', name: '포도', avatarUrl: av('koala') };

interface BaseMsg {
  kind: 'message';
  id: string;
  sender: User;
  isMine: boolean;
}
interface TextMsg extends BaseMsg { type: 'text'; text: string }
interface FileMsg extends BaseMsg { type: 'file'; fileName: string; fileSize: string }
type MessageItem = TextMsg | FileMsg;
interface DateItem { kind: 'date'; id: string; label: string }
type ChatItem = MessageItem | DateItem;

const ITEMS: ChatItem[] = [
  { kind: 'date', id: 'd1', label: '2025년 5월 22일 목요일' },
  { kind: 'message', id: 'm1', sender: GOMGOM, isMine: false, type: 'text', text: 'API PR 리뷰 부탁드려요! @바나나 확인해주실 수 있나요?' },
  { kind: 'message', id: 'm2', sender: ME_USER, isMine: true, type: 'text', text: '네, 바로 확인해볼게요!' },
  { kind: 'message', id: 'm3', sender: ME_USER, isMine: true, type: 'file', fileName: '설계문서_v2.pdf', fileSize: '2.4 MB' },
  { kind: 'date', id: 'd2', label: '2025년 5월 23일 금요일' },
  { kind: 'message', id: 'm4', sender: PODO, isMine: false, type: 'text', text: '@곰곰 수고하셨어요! 오늘 회의 10시로 변경 가능할까요?' },
  { kind: 'message', id: 'm5', sender: PODO, isMine: false, type: 'file', fileName: '회의록_0523.docx', fileSize: '1.1 MB' },
];

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
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M17.5 2.5L9.17 10.83M17.5 2.5L12.5 17.5L9.17 10.83L2.5 7.5L17.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageUploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M2.5 13.5L6 10l3 3 3-3 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M16.5 9.5L9 17c-2.2 2.2-5.8 2.2-8 0s-2.2-5.8 0-8l8.5-8.5c1.4-1.4 3.6-1.4 5 0s1.4 3.6 0 5L7 13c-.6.6-1.6.6-2.2 0s-.6-1.6 0-2.2l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function OtherBubble({ msg }: { msg: MessageItem }) {
  return (
    <div className="flex items-start gap-2">
      <img
        src={msg.sender.avatarUrl}
        alt={msg.sender.name}
        className="size-9 rounded-full shrink-0 object-cover"
      />
      <div className="flex flex-col gap-1">
        <span className="text-caption text-gray-500">{msg.sender.name}</span>
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
            <button type="button" className="text-gray-400 shrink-0">
              <DownloadIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MyBubble({ msg }: { msg: MessageItem }) {
  return (
    <div className="flex justify-end">
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
          <button type="button" className="text-gray-25 shrink-0">
            <DownloadIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ProjectChatPage() {
  const [input, setInput] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="bg-gray-25 min-h-full">
      {/* 메시지 목록 — 하단 입력창 높이만큼 pb 확보 */}
      <div className="px-4 pt-4 pb-28 flex flex-col gap-4">
        {ITEMS.map((item) => {
          if (item.kind === 'date') {
            return (
              <div key={item.id} className="flex justify-center">
                <span className="bg-gray-100 rounded-full px-3 py-1 text-caption text-gray-400">
                  {item.label}
                </span>
              </div>
            );
          }
          return item.isMine
            ? <MyBubble key={item.id} msg={item} />
            : <OtherBubble key={item.id} msg={item} />;
        })}
      </div>

      {/* 하단 입력창 — fixed, BottomTabBar 패턴과 동일하게 left-1/2 -translate-x-1/2 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile border-t border-gray-100 bg-white px-4 pt-3 pb-8">
        <div className="flex items-center gap-3">
          {/* 첨부 팝업 + 트리거 버튼 */}
          <div className="relative shrink-0">
            {showPopup && (
              <div
                ref={popupRef}
                className={cn(
                  'absolute bottom-full left-0 mb-2 z-20',
                  'w-40 bg-gray-25 border border-gray-200 rounded-xl shadow-md overflow-hidden',
                )}
              >
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50 border-b border-gray-200"
                >
                  <ImageUploadIcon />
                  이미지 업로드
                </button>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-body-sm text-gray-700 hover:bg-gray-50"
                >
                  <PaperclipIcon />
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
            type="button"
            className="size-10 bg-primary rounded-md flex items-center justify-center shrink-0 text-gray-25 hover:bg-primary-600 transition-colors"
            aria-label="전송"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
