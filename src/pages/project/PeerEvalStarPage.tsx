import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePeerEvaluationStore } from '../../store/peerEvaluationStore';
import { useProjectStore } from '../../store/projectStore';

const CATEGORIES = [
  { id: 'attitude', label: '협업 태도', sub: '소통 방식, 팀 분위기 기여도' },
  { id: 'leadership', label: '리더십', sub: '업무 주도, 의사결정 참여도' },
  { id: 'communication', label: '커뮤니케이션', sub: '피드백 제공, 논의 촉진 빈도' },
  { id: 'output', label: '산출물 기여', sub: '결과물의 양과 질' },
];

// ── SVG 아이콘 ───────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M10.5268 1.29489C10.5706 1.20635 10.6383 1.13183 10.7223 1.07972C10.8062 1.02761 10.903 1 11.0018 1C11.1006 1 11.1974 1.02761 11.2813 1.07972C11.3653 1.13183 11.433 1.20635 11.4768 1.29489L13.7868 5.97389C13.939 6.28186 14.1636 6.5483 14.4414 6.75035C14.7192 6.95239 15.0419 7.08401 15.3818 7.13389L20.5478 7.88989C20.6457 7.90408 20.7376 7.94537 20.8133 8.00909C20.8889 8.07282 20.9452 8.15644 20.9758 8.2505C21.0064 8.34456 21.0101 8.4453 20.9864 8.54133C20.9627 8.63736 20.9126 8.72485 20.8418 8.79389L17.1058 12.4319C16.8594 12.672 16.6751 12.9684 16.5686 13.2955C16.4622 13.6227 16.4369 13.9708 16.4948 14.3099L17.3768 19.4499C17.3941 19.5477 17.3835 19.6485 17.3463 19.7406C17.3091 19.8327 17.2467 19.9125 17.1663 19.9709C17.086 20.0293 16.9908 20.0639 16.8917 20.0708C16.7926 20.0777 16.6935 20.0566 16.6058 20.0099L11.9878 17.5819C11.6835 17.4221 11.345 17.3386 11.0013 17.3386C10.6576 17.3386 10.3191 17.4221 10.0148 17.5819L5.3978 20.0099C5.31013 20.0563 5.2112 20.0772 5.11225 20.0701C5.0133 20.0631 4.91832 20.0285 4.83809 19.9701C4.75787 19.9118 4.69563 19.8321 4.65846 19.7401C4.62128 19.6481 4.61066 19.5476 4.6278 19.4499L5.5088 14.3109C5.567 13.9716 5.54178 13.6233 5.43534 13.2959C5.32889 12.9686 5.14441 12.672 4.8978 12.4319L1.1618 8.79489C1.09039 8.72593 1.03979 8.63829 1.01576 8.54197C0.991731 8.44565 0.995237 8.34451 1.02588 8.25008C1.05652 8.15566 1.11307 8.07174 1.18908 8.00788C1.26509 7.94402 1.3575 7.90279 1.4558 7.88889L6.6208 7.13389C6.96106 7.08439 7.28419 6.95295 7.56238 6.75088C7.84058 6.54881 8.0655 6.28216 8.2178 5.97389L10.5268 1.29489Z"
        fill={filled ? '#173E8A' : 'none'}
        stroke={filled ? '#173E8A' : '#DDE2E9'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0 mt-0.5">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#2186FB" strokeWidth="1.2" />
      <path d="M7.5 6.5v4" stroke="#2186FB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="4.5" r="0.75" fill="#2186FB" />
    </svg>
  );
}

// ── 별점 행 ──────────────────────────────────────────────────────────────────

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered > 0 ? hovered : value;

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${n}점`}
        >
          <StarIcon filled={n <= display} />
        </button>
      ))}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PeerEvalStarPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const saveMemberScores = usePeerEvaluationStore((s) => s.saveMemberScores);
  const savedScores = usePeerEvaluationStore((s) =>
    id && memberId ? s.byProject[id]?.evaluations[memberId]?.scores : undefined
  );
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const peer = project?.members.find((m) => m.id === memberId);
  const member = { name: peer?.nickname ?? memberId ?? '', avatarUrl: peer?.profileImageUrl ?? '' };

  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, savedScores?.[c.id] ?? 4])),
  );
  const [hasInteracted, setHasInteracted] = useState(false);

  // 평가자가 모든 항목에 동일 점수를 주는 것을 막기 위한 실시간 가이드(Nudge).
  // 상호작용 후 전 항목이 동일값이면 배너를 띄우고 [다음]을 막는다.
  const allSame = useMemo(() => {
    const values = Object.values(ratings);
    return values.every((v) => v === values[0]);
  }, [ratings]);

  const showNudge = hasInteracted && allSame;

  const setRating = (categoryId: string, value: number) => {
    setHasInteracted(true);
    setRatings((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleNext = () => {
    if (showNudge || !id || !memberId) return;
    saveMemberScores(id, memberId, ratings);
    navigate(`/project/${id}/peer-eval/${memberId}/keyword`);
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-25">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-gray-25 border-b border-gray-100 h-14 px-6 flex items-center gap-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="shrink-0">
          <ChevronLeft />
        </button>
        <span className="text-title text-gray-900">Peer 평가</span>
      </header>

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-5">
        {/* 대상 팀원 — 아바타 + 이름만 표시 */}
        <div className="flex items-center gap-3">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="size-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="size-10 rounded-full bg-gray-100 shrink-0" />
          )}
          <p className="text-title font-semibold text-gray-900">{member.name}</p>
        </div>

        {/* 안내 문구 */}
        <p className="text-caption text-gray-400">
          <span className="text-primary">필수</span>{'   각 항목에 대하여 점수를 부여해 주세요'}
        </p>

        {/* 카테고리별 별점 — 구분선 행 */}
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center justify-between px-5 h-[72px]',
                i < CATEGORIES.length - 1 && 'border-b border-gray-200',
              )}
            >
              <div>
                <p className="text-title text-gray-900">{cat.label}</p>
                <p className="text-caption text-gray-400">{cat.sub}</p>
              </div>
              <StarRow value={ratings[cat.id]} onChange={(v) => setRating(cat.id, v)} />
            </div>
          ))}
        </div>

        {/* 안내 박스 — 하단 배치 */}
        <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <div className="text-caption text-primary leading-5">
            <p className="font-medium">팀원마다 강점이 다를 수 있어요</p>
            <p className="font-medium">신중하게 평가해 주세요</p>
          </div>
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        {showNudge && (
          <div className="mb-3 bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
            <InfoIcon />
            <p className="text-caption text-primary leading-5">
              팀원마다 강점이 다를 수 있어요. 신중하게 평가해 주세요.
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={showNudge}
          onClick={handleNext}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            showNudge
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-gray-25 hover:bg-primary-600',
          )}
        >
          다음
        </button>
      </div>
    </div>
  );
}
