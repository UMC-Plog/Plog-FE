import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  createPeerEvaluation,
  updatePeerEvaluation,
  fetchEvaluationTargets,
  type PeerEvaluationCreateRequest,
} from '../../api/evaluation';
import { ApiError } from '../../api/client';
import { AlertModal } from '../../components/Modal';
import { PeerEvalAvatar } from '../../components/PeerEvalAvatar';
import type { ProfilePreset } from '../../lib/profilePreset';

const ALL_KEYWORDS = ['리더십', '성실함', '소통 능력', '책임감', '문제 해결', '창의성', '꼼꼼함', '추진력'];
const DEFAULT_SELECTED = new Set(['리더십']);
const REQUIRED_KEYWORD_COUNT = 3;

interface NavState {
  scores?: Record<string, number>;
  keywords?: string[];
  feedback?: string;
  isExisting?: boolean;
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

export default function PeerEvalKeywordPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as NavState | null) ?? null;
  const [nickname, setNickname] = useState('');
  const [profilePreset, setProfilePreset] = useState<ProfilePreset | null>(null);
  const [notice, setNotice] = useState<{ message: string; submitted: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 별점 화면을 거치지 않고 이 화면으로 바로 들어온 경우 점수 정보가 없어 제출할 수 없음
    if (!navState?.scores) {
      navigate(`/project/${id}/peer-eval/${memberId}/star`, { replace: true });
    }
  }, [navState, id, memberId, navigate]);

  useEffect(() => {
    const projectId = Number(id);
    const targetMemberId = Number(memberId);
    if (!Number.isFinite(projectId) || !Number.isFinite(targetMemberId)) return;
    let cancelled = false;
    fetchEvaluationTargets(projectId)
      .then((res) => {
        if (cancelled) return;
        const target = res.targets.find((t) => t.projectMemberId === targetMemberId);
        if (target) {
          setNickname(target.nickname);
          setProfilePreset(target.profilePreset);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, memberId]);

  const [selected, setSelected] = useState<Set<string>>(
    new Set(navState?.keywords?.length ? navState.keywords : DEFAULT_SELECTED),
  );
  const [feedback, setFeedback] = useState(navState?.feedback ?? '');

  // 점수만으로는 평가 완료 불가 — 핵심 키워드 3개 + 상세 피드백 작성이 모두 필수
  const canComplete =
    selected.size === REQUIRED_KEYWORD_COUNT && feedback.trim().length > 0 && !submitting;

  const toggle = (kw: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else if (next.size < REQUIRED_KEYWORD_COUNT) next.add(kw);
      return next;
    });

  const handleComplete = async () => {
    if (!canComplete || !id || !memberId || !navState?.scores) return;
    const projectId = Number(id);
    const targetMemberId = Number(memberId);

    const body: PeerEvaluationCreateRequest = {
      collaborationScore: navState.scores.collaborationScore,
      initiativeScore: navState.scores.initiativeScore,
      communicationScore: navState.scores.communicationScore,
      outputScore: navState.scores.outputScore,
      keywords: Array.from(selected),
      feedback: feedback.trim(),
    };

    setSubmitting(true);
    try {
      const submit = navState.isExisting ? updatePeerEvaluation : createPeerEvaluation;
      const result = await submit(projectId, targetMemberId, body);
      if (result.isNudgeTriggered) {
        setNotice({
          message: '평가 점수의 변별력이 낮아요. 다음부턴 팀원마다 다르게 평가하는 걸 고려해 주세요.',
          submitted: true,
        });
      } else {
        navigate(`/project/${id}/peer-eval`);
      }
    } catch (err) {
      setNotice({
        message: err instanceof ApiError ? err.message : '제출에 실패했어요. 다시 시도해 주세요.',
        submitted: false,
      });
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
        {/* 대상 팀원 */}
        <div className="flex items-center gap-3">
          <PeerEvalAvatar profilePreset={profilePreset} />
          <p className="text-title font-semibold text-gray-900">{nickname}</p>
        </div>

        {/* 핵심 키워드 */}
        <div className="flex flex-col gap-3">
          <p className="text-body text-gray-900">핵심 키워드</p>
          <p className="text-caption text-gray-400">
            <span className="text-primary">필수</span>{'   해당하는 키워드를 3개 선택하세요'}
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

      <AlertModal
        open={Boolean(notice)}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-100 text-primary-500">
            <InfoIcon />
          </span>
        }
        title={notice?.message ?? ''}
        confirmText="확인"
        onConfirm={() => {
          const submitted = notice?.submitted ?? false;
          setNotice(null);
          if (submitted) navigate(`/project/${id}/peer-eval`);
        }}
      />
    </div>
  );
}
