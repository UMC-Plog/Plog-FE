import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { createSelfFeedback, fetchMySelfFeedback, updateSelfFeedback } from '../../api/evaluation';
import { ApiError } from '../../api/client';
import { AlertModal } from '../../components/Modal';

const FIELDS = [
  {
    id: 'tasks',
    label: '실제 수행한 업무',
    placeholder: '수행한 업무를 작성해 주세요',
  },
  {
    id: 'contribution',
    label: '기여했다고 생각하는 부분',
    placeholder: '어떤 부분에서 기여했는지 작성해 주세요',
  },
  {
    id: 'hardship',
    label: '어려웠던 점',
    placeholder: '프로젝트에서 어려웠던 부분을 작성해 주세요',
  },
  {
    id: 'improvement',
    label: '개선점',
    placeholder: '개선하고 싶은 점을 작성해 주세요',
  },
  {
    id: 'role',
    label: '협업 과정에서 맡았던 역할',
    placeholder: '팀 내에서 맡은 역할을 설명해 주세요',
  },
] as const;

// 백엔드는 서술형 입력 5개를 각각 받지 않고 content 하나만 받아서, 라벨로 구분해 하나의 텍스트로 합쳐 보낸다.
function buildContent(values: Record<string, string>) {
  return FIELDS.map((field) => `[${field.label}]\n${values[field.id] ?? ''}`).join('\n\n');
}

function parseContent(content: string): Record<string, string> {
  const labelToId = Object.fromEntries(FIELDS.map((f) => [f.label, f.id]));
  const result: Record<string, string> = {};
  const sections = content.split(/\n(?=\[.+\]\n)/);
  for (const section of sections) {
    const match = section.match(/^\[(.+)\]\n([\s\S]*)$/);
    if (!match) continue;
    const id = labelToId[match[1]];
    if (id) result[id] = match[2].trim();
  }
  return result;
}

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
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.id, ''])),
  );
  const [isExisting, setIsExisting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) return;
    let cancelled = false;
    fetchMySelfFeedback(projectId)
      .then((res) => {
        if (cancelled) return;
        setIsExisting(true);
        setValues((prev) => ({ ...prev, ...parseContent(res.content) }));
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 또는 EVAL400_3(백엔드 실제 미작성 응답) = 아직 자기 피드백을 작성하지 않은 정상 상태.
        // 그 외는 실제 조회 실패이므로 알려야 한다.
        if (err instanceof ApiError && (err.status === 404 || err.code === 'EVAL400_3')) return;
        setNotice('기존 자기 피드백을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canComplete = FIELDS.every((field) => values[field.id]?.trim().length > 0) && !submitting;

  const setValue = (fieldId: string, value: string) =>
    setValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleComplete = async () => {
    if (!id || !canComplete) return;
    const projectId = Number(id);
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const content = buildContent(trimmed);

    setSubmitting(true);
    try {
      const submit = isExisting ? updateSelfFeedback : createSelfFeedback;
      await submit(projectId, content);
      navigate(`/project/${id}/peer-eval`);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : '제출에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
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
          <p className="text-caption font-normal text-gray-400">
            점수를 직접 높이는 항목이 아닙니다. 활동 로그만으로 파악하기 어려운 기여 맥락을 보완하는 서술형 입력입니다.
          </p>
        </div>

        {/* 입력 필드 목록 */}
        <div className="flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.id} className="flex flex-col gap-2">
              <label htmlFor={field.id} className="text-body text-gray-900">
                {field.label}
              </label>
              <input
                id={field.id}
                type="text"
                value={values[field.id]}
                onChange={(e) => setValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                className={cn(
                  'border border-gray-200 rounded-lg px-[19px] h-14',
                  'text-body text-gray-900 placeholder:text-gray-400 bg-white',
                  'focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </div>
          ))}
        </div>

        {/* 안내 박스 — 입력 필드 아래 배치 */}
        <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <div className="text-caption text-primary leading-5">
            <p className="font-medium">자기 피드백은 업무카드, 활동로그, Peer 평가와 교차 검증되어</p>
            <p className="font-medium">AI 분석의 보조 맥락으로 활용됩니다.</p>
          </div>
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

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
