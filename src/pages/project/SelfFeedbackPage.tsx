import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { usePeerEvaluationStore } from '../../store/peerEvaluationStore';

const FIELDS = [
  {
    id: 'tasks',
    label: '실제 수행한 업무',
    placeholder: '예) API 설계, 프론트엔드 연동, 배포 자동화 스크립트 작성',
  },
  {
    id: 'contribution',
    label: '기여했다고 생각하는 부분',
    placeholder: '예) 배포 자동화로 팀 전체 배포 시간을 40% 단축했어요',
  },
  {
    id: 'hardship',
    label: '어려웠던 점',
    placeholder: '예) 레거시 코드 파악에 시간이 많이 걸렸어요',
  },
  {
    id: 'improvement',
    label: '개선점',
    placeholder: '예) 코드 리뷰 문화를 정착시키면 좋겠어요',
  },
  {
    id: 'role',
    label: '협업 과정에서 맡았던 역할',
    placeholder: '예) 주 1회 스프린트 회의 진행, 이슈 트래킹 관리',
  },
];

// ── SVG 아이콘 ───────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function SelfFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const completeSelfFeedback = usePeerEvaluationStore((s) => s.completeSelfFeedback);
  const savedValues = usePeerEvaluationStore((s) =>
    id ? s.byProject[id]?.selfFeedback?.values : undefined
  );

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.id, savedValues?.[f.id] ?? ''])),
  );

  const canComplete = FIELDS.every((field) => values[field.id]?.trim().length > 0);

  const setValue = (fieldId: string, value: string) =>
    setValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleComplete = () => {
    if (!id || !canComplete) return;
    completeSelfFeedback(
      id,
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])),
    );
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
        {/* 제목 */}
        <div className="flex flex-col gap-1">
          <h1 className="text-h3 font-semibold text-gray-900">자기 피드백이란?</h1>
          <p className="text-caption text-gray-400">
            활동 로그로 파악하기 어려운 기여 맥락을 직접 작성합니다
          </p>
        </div>

        {/* 안내 박스 */}
        <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <p className="text-caption text-primary leading-5">
            자기 피드백은 업무카드, 활동로그, Peer 평가와 교차 검증되어 AI 분석의 보조 맥락으로 활용됩니다.
          </p>
        </div>

        {/* 입력 필드 목록 */}
        <div className="flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.id} className="flex flex-col gap-2">
              <label htmlFor={field.id} className="text-body-sm font-semibold text-gray-700">
                {field.label}
              </label>
              <input
                id={field.id}
                type="text"
                value={values[field.id]}
                onChange={(e) => setValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  'border border-gray-200 rounded-lg px-5 h-14',
                  'text-body text-gray-900 placeholder:text-gray-400 bg-white',
                  'focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </div>
          ))}
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
