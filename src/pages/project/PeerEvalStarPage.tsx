import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchEvaluationTargets, fetchPeerEvaluationDetail, type PeerEvaluationDetailResponse } from '../../api/evaluation';
import { PeerEvalAvatar } from '../../components/PeerEvalAvatar';
import type { ProfilePreset } from '../../lib/profilePreset';

const CATEGORIES = [
  { id: 'collaborationScore', label: '협업 태도', sub: '소통 방식, 팀 분위기 기여도' },
  { id: 'initiativeScore', label: '리더십', sub: '업무 주도, 의사결정 참여도' },
  { id: 'communicationScore', label: '커뮤니케이션', sub: '피드백 제공, 논의 촉진 빈도' },
  { id: 'outputScore', label: '산출물 기여', sub: '결과물의 양과 질' },
] as const;

// ── SVG 아이콘 ───────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path
          d="M10.5268 1.29489C10.5706 1.20635 10.6383 1.13183 10.7223 1.07972C10.8062 1.02761 10.903 1 11.0018 1C11.1006 1 11.1974 1.02761 11.2813 1.07972C11.3653 1.13183 11.433 1.20635 11.4768 1.29489L13.7868 5.97389C13.939 6.28186 14.1636 6.5483 14.4414 6.75035C14.7192 6.95239 15.0419 7.08401 15.3818 7.13389L20.5478 7.88989C20.6457 7.90408 20.7376 7.94537 20.8133 8.00909C20.8889 8.07282 20.9452 8.15644 20.9758 8.2505C21.0064 8.34456 21.0101 8.4453 20.9864 8.54133C20.9627 8.63736 20.9126 8.72485 20.8418 8.79389L17.1058 12.4319C16.8594 12.672 16.6751 12.9684 16.5686 13.2955C16.4622 13.6227 16.4369 13.9708 16.4948 14.3099L17.3768 19.4499C17.3941 19.5477 17.3835 19.6485 17.3463 19.7406C17.3091 19.8327 17.2467 19.9125 17.1663 19.9709C17.086 20.0293 16.9908 20.0639 16.8917 20.0708C16.7926 20.0777 16.6935 20.0566 16.6058 20.0099L11.9878 17.5819C11.6835 17.4221 11.345 17.3386 11.0013 17.3386C10.6576 17.3386 10.3191 17.4221 10.0148 17.5819L5.3978 20.0099C5.31013 20.0563 5.2112 20.0772 5.11225 20.0701C5.0133 20.0631 4.91832 20.0285 4.83809 19.9701C4.75787 19.9118 4.69563 19.8321 4.65846 19.7401C4.62128 19.6481 4.61066 19.5476 4.6278 19.4499L5.5088 14.3109C5.567 13.9716 5.54178 13.6233 5.43534 13.2959C5.32889 12.9686 5.14441 12.672 4.8978 12.4319L1.1618 8.79489C1.09039 8.72593 1.03979 8.63829 1.01576 8.54197C0.991731 8.44565 0.995237 8.34451 1.02588 8.25008C1.05652 8.15566 1.11307 8.07174 1.18908 8.00788C1.26509 7.94402 1.3575 7.90279 1.4558 7.88889L6.6208 7.13389C6.96106 7.08439 7.28419 6.95295 7.56238 6.75088C7.84058 6.54881 8.0655 6.28216 8.2178 5.97389L10.5268 1.29489Z"
          fill="#173E8A"
          stroke="#173E8A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11.5248 2.29489C11.5687 2.20635 11.6364 2.13183 11.7203 2.07972C11.8042 2.02761 11.9011 2 11.9998 2C12.0986 2 12.1955 2.02761 12.2794 2.07972C12.3633 2.13183 12.431 2.20635 12.4748 2.29489L14.7848 6.97389C14.937 7.28186 15.1617 7.5483 15.4395 7.75035C15.7173 7.95239 16.04 8.08401 16.3798 8.13389L21.5458 8.88989C21.6437 8.90408 21.7357 8.94537 21.8113 9.00909C21.887 9.07282 21.9433 9.15644 21.9739 9.2505C22.0045 9.34456 22.0081 9.4453 21.9844 9.54133C21.9607 9.63736 21.9107 9.72485 21.8398 9.79389L18.1038 13.4319C17.8575 13.672 17.6731 13.9684 17.5667 14.2955C17.4602 14.6227 17.4349 14.9708 17.4928 15.3099L18.3748 20.4499C18.3921 20.5477 18.3816 20.6485 18.3443 20.7406C18.3071 20.8327 18.2448 20.9125 18.1644 20.9709C18.084 21.0293 17.9888 21.0639 17.8897 21.0708C17.7906 21.0777 17.6915 21.0566 17.6038 21.0099L12.9858 18.5819C12.6816 18.4221 12.343 18.3386 11.9993 18.3386C11.6557 18.3386 11.3171 18.4221 11.0128 18.5819L6.39585 21.0099C6.30818 21.0563 6.20924 21.0772 6.1103 21.0701C6.01135 21.0631 5.91636 21.0285 5.83614 20.9701C5.75592 20.9118 5.69368 20.8321 5.6565 20.7401C5.61933 20.6482 5.6087 20.5476 5.62585 20.4499L6.50685 15.3109C6.56504 14.9716 6.53983 14.6233 6.43338 14.2959C6.32694 13.9686 6.14245 13.672 5.89585 13.4319L2.15985 9.79489C2.08844 9.72593 2.03784 9.63829 2.01381 9.54197C1.98978 9.44565 1.99328 9.34451 2.02393 9.25008C2.05457 9.15566 2.11111 9.07174 2.18712 9.00788C2.26313 8.94402 2.35555 8.90279 2.45385 8.88889L7.61885 8.13389C7.9591 8.08439 8.28224 7.95295 8.56043 7.75088C8.83863 7.54881 9.06355 7.28216 9.21585 6.97389L11.5248 2.29489Z"
        stroke="#173E8A"
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
  const [nickname, setNickname] = useState('');
  const [profilePreset, setProfilePreset] = useState<ProfilePreset | null>(null);
  const [existing, setExisting] = useState<PeerEvaluationDetailResponse | null>(null);

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

    fetchPeerEvaluationDetail(projectId, targetMemberId)
      .then((detail) => {
        if (!cancelled) setExisting(detail);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [id, memberId]);

  // Figma 기준 최초 진입 시 전 항목 미선택(0점) 상태로 시작, 기존 평가가 있으면 그 값으로 채움
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])),
  );

  useEffect(() => {
    if (!existing) return;
    setRatings({
      collaborationScore: existing.collaborationScore,
      initiativeScore: existing.initiativeScore,
      communicationScore: existing.communicationScore,
      outputScore: existing.outputScore,
    });
  }, [existing]);

  const allRated = useMemo(() => Object.values(ratings).every((v) => v >= 1), [ratings]);

  // 평가자가 모든 항목에 동일 점수를 주는 것에 대한 실시간 가이드(Nudge).
  // 전 항목을 다 채웠는데 값이 전부 같으면 배너로 안내하되, 진행 자체는 막지 않는다.
  // (최종 판단은 제출 시 서버의 isNudgeTriggered로 다시 확인됨)
  const allSame = useMemo(() => {
    const values = Object.values(ratings);
    return values.every((v) => v === values[0]);
  }, [ratings]);

  const showNudge = allRated && allSame;
  const canProceed = allRated;

  const setRating = (categoryId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleNext = () => {
    if (!canProceed || !id || !memberId) return;
    navigate(`/project/${id}/peer-eval/${memberId}/keyword`, {
      state: {
        scores: ratings,
        keywords: existing?.keyword,
        feedback: existing?.feedback,
        isExisting: Boolean(existing),
      },
    });
  };

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden bg-gray-25">
      {/* 헤더 */}
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-6 border-b border-gray-100 bg-gray-25 px-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="shrink-0">
          <ChevronLeft />
        </button>
        <span className="text-title text-gray-900">Peer 평가</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 flex flex-col gap-5">
        {/* 대상 팀원 — 익명성 정책상 닉네임만 표시 */}
        <div className="flex items-center gap-3">
          <PeerEvalAvatar profilePreset={profilePreset} />
          <p className="text-title font-semibold text-gray-900">{nickname}</p>
        </div>

        {/* 안내 문구 */}
        <p className="text-caption text-gray-400">
          <span className="text-primary">필수</span>{'   각 항목에 대하여 점수를 부여해 주세요'}
        </p>

        {/* 카테고리별 별점 — Figma 기준 카드 없이 구분선만 있는 플랫 리스트 */}
        <div className="flex flex-col">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center justify-between px-1 py-2 h-[72px]',
                i < CATEGORIES.length - 1 && 'border-b border-gray-200',
              )}
            >
              <div>
                <p className="text-title font-normal leading-normal text-gray-900">{cat.label}</p>
                <p className="text-caption font-normal leading-normal text-gray-400">{cat.sub}</p>
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
      <div className="w-full shrink-0 bg-white px-5 pb-8 pt-3">
        {showNudge && (
          <div className="mb-3 bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
            <InfoIcon />
            <p className="text-caption text-primary leading-5">
              항목별로 강점이 다를 수 있으니, 한 번 더 점검해 주세요.
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={!canProceed}
          onClick={handleNext}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            canProceed
              ? 'bg-primary text-gray-25 hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          다음
        </button>
      </div>
    </div>
  );
}
