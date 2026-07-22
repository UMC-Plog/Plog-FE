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
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 3L19.708 11.382L28.944 12.292L22.28 18.382L24.18 27.472L16 22.82L7.82 27.472L9.72 18.382L3.056 12.292L12.292 11.382L16 3Z"
        fill={filled ? '#2186FB' : 'none'}
        stroke={filled ? '#2186FB' : '#DDE2E9'}
        strokeWidth="1.5"
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
  // 평가자가 모든 항목에 동일 점수를 주는 것을 막기 위한 실시간 가이드(Nudge).
  // 값이 전부 같으면(평균편차 0) 배너를 띄우고 [다음]을 막다가, 하나라도 값을 바꾸면 풀어준다.
  const allSame = useMemo(() => {
    const values = Object.values(ratings);
    return values.every((v) => v === values[0]);
  }, [ratings]);

  const setRating = (categoryId: string, value: number) =>
    setRatings((prev) => ({ ...prev, [categoryId]: value }));

  const handleNext = () => {
    if (allSame || !id || !memberId) return;
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
        {/* 대상 팀원 */}
        <div className="flex items-center gap-3">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="size-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="size-10 rounded-full bg-gray-100 shrink-0" />
          )}
          <div>
            <p className="text-body-sm text-gray-400">평가 대상</p>
            <p className="text-title font-semibold text-gray-900">{member.name}</p>
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <div className="text-caption text-primary leading-5">
            <p className="font-semibold">팀원마다 강점이 다를 수 있어요</p>
            <p>신중하게 평가해 주세요</p>
          </div>
        </div>

        {/* 카테고리별 별점 */}
        <div className="flex flex-col gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-gray-100 rounded-2xl shadow-md px-5 py-4 flex flex-col gap-3"
            >
              <div>
                <p className="text-title text-gray-900">{cat.label}</p>
                <p className="text-caption text-gray-400 mt-0.5">{cat.sub}</p>
              </div>
              <StarRow value={ratings[cat.id]} onChange={(v) => setRating(cat.id, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        {allSame && (
          <div className="mb-3 bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
            <InfoIcon />
            <p className="text-caption text-primary leading-5">
              팀원마다 강점이 다를 수 있어요. 신중하게 평가해 주세요.
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={allSame}
          onClick={handleNext}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            allSame
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
