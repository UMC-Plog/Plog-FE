import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePeerEvaluationStore } from '../../store/peerEvaluationStore';
import { useProjectStore } from '../../store/projectStore';

const ALL_KEYWORDS = ['리더십', '성실함', '소통 능력', '책임감', '문제 해결', '창의성', '꼼꼼함', '추진력'];
const DEFAULT_SELECTED = new Set(['리더십', '성실함', '문제 해결', '창의성']);

// ── SVG 아이콘 ───────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PeerEvalKeywordPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const completeMemberEvaluation = usePeerEvaluationStore((s) => s.completeMemberEvaluation);
  const savedEvaluation = usePeerEvaluationStore((s) =>
    id && memberId ? s.byProject[id]?.evaluations[memberId] : undefined
  );
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const peer = project?.members.find((m) => m.id === memberId);
  const member = { name: peer?.nickname ?? memberId ?? '', avatarUrl: peer?.profileImageUrl ?? '' };

  const [selected, setSelected] = useState<Set<string>>(
    new Set(savedEvaluation?.keywords.length ? savedEvaluation.keywords : DEFAULT_SELECTED),
  );
  const [feedback, setFeedback] = useState(savedEvaluation?.feedback ?? '');

  // 점수만으로는 평가 완료 불가 — 핵심 키워드 1개 이상 + 상세 피드백 작성이 둘 다 필수
  const canComplete = selected.size > 0 && feedback.trim().length > 0;

  const toggle = (kw: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });

  const handleComplete = () => {
    if (!canComplete || !id || !memberId) return;
    completeMemberEvaluation(id, memberId, Array.from(selected), feedback.trim());
    navigate(`/project/${id}/peer-eval`);
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
          <p className="text-title font-semibold text-gray-900">{member.name}</p>
        </div>

        {/* 핵심 키워드 */}
        <div className="flex flex-col gap-3">
          <p className="text-body text-gray-900">핵심 키워드</p>
          <p className="text-caption text-gray-400">
            <span className="text-primary">필수</span>{'   해당하는 키워드를 선택하세요'}
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => toggle(kw)}
                className={cn(
                  'rounded-full px-3.5 py-2 text-body-sm transition-colors',
                  selected.has(kw)
                    ? 'bg-primary-100 text-primary'
                    : 'border border-gray-200 text-gray-400 bg-white',
                )}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* AI 분석용 상세 피드백 */}
        <div className="flex flex-col gap-3">
          <p className="text-body text-gray-900">AI 분석용 상세 피드백</p>
          <p className="text-caption text-gray-400">
            <span className="text-primary">필수</span>{'   활동 로그 기반으로 구체적으로 작성할수록 리포트 품질이 높아집니다'}
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="예) 매주 일정 조율을 주도했고, 팀원 간 의견 충돌 시 중재 역할을 했어요."
            className="border border-gray-200 rounded-lg px-5 py-[19px] h-[280px] resize-none text-body text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        <button
          type="button"
          disabled={!canComplete}
          onClick={handleComplete}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            canComplete
              ? 'bg-primary text-gray-25 hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          완료
        </button>
      </div>
    </div>
  );
}
