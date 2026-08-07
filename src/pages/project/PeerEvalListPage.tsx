import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchEvaluationTargets, fetchMySelfFeedback, type TargetMember } from '../../api/evaluation';
import { getIntegrationActorMappings, getProjectIntegrations } from '../../api/projectApi';
import { ApiError } from '../../api/client';
import { AlertModal } from '../../components/Modal';
import type { ProjectIntegrationType } from '../../types/project';
import { PeerEvalAvatar } from '../../components/PeerEvalAvatar';

// actor-mappings API는 Google을 google-docs/google-slides로 분리해서 받는다.
type AccountProvider = 'github' | 'figma' | 'notion' | 'google-docs' | 'google-slides';

// 연동 상태 조회는 GITHUB, FIGMA, NOTION, GOOGLE_DOCS, GOOGLE_SLIDES 5개를 순서대로 내려준다.
// Google은 연동도 계정 매핑도 Docs/Slides로 나뉘므로 각각 별개 단계로 취급한다.
const PROVIDER_ORDER: { param: AccountProvider; type: ProjectIntegrationType }[] = [
  { param: 'github', type: 'GITHUB' },
  { param: 'figma', type: 'FIGMA' },
  { param: 'notion', type: 'NOTION' },
  { param: 'google-docs', type: 'GOOGLE_DOCS' },
  { param: 'google-slides', type: 'GOOGLE_SLIDES' },
];

// 카드 우측 액션(작성하기/연결하기/완료)은 Figma 실측 기준 높이 32px 고정이다.
// text-body-sm의 기본 line-height(21px)를 쓰면 37px가 되어 제목 행이 밀리므로 leading을 고정한다.
const CARD_ACTION_CLASS =
  'inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[14px] leading-4 transition-colors';
const CARD_ACTION_DONE_CLASS = `${CARD_ACTION_CLASS} bg-success/10 text-success`;

// ── SVG 아이콘 ──────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <div className="size-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
      <svg width="15" height="15" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path
          d="M12.9375 17.0625C10.9792 15.1042 10 12.75 10 10C10 7.25 10.9792 4.89583 12.9375 2.9375C14.8958 0.979167 17.25 0 20 0C22.75 0 25.1042 0.979167 27.0625 2.9375C29.0208 4.89583 30 7.25 30 10C30 12.75 29.0208 15.1042 27.0625 17.0625C25.1042 19.0208 22.75 20 20 20C17.25 20 14.8958 19.0208 12.9375 17.0625ZM0 35V33C0 31.5833 0.365001 30.2817 1.095 29.095C1.825 27.9083 2.79333 27.0017 4 26.375C6.58333 25.0833 9.20833 24.115 11.875 23.47C14.5417 22.825 17.25 22.5017 20 22.5C22.75 22.4983 25.4583 22.8217 28.125 23.47C30.7917 24.1183 33.4167 25.0867 36 26.375C37.2083 27 38.1775 27.9067 38.9075 29.095C39.6375 30.2833 40.0017 31.585 40 33V35C40 36.375 39.5108 37.5525 38.5325 38.5325C37.5542 39.5125 36.3767 40.0017 35 40H5C3.625 40 2.44833 39.5108 1.47 38.5325C0.491666 37.5542 0.00166667 36.3767 0 35Z"
          fill="#FAFBFC"
        />
      </svg>
    </div>
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

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
      <InfoIcon />
      {children}
    </div>
  );
}

// ── 진행률 바 ────────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="bg-gray-100 h-2 rounded-full overflow-hidden w-full">
      <div
        className="h-full bg-plog-gradient rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PeerEvalListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<TargetMember[]>([]);
  const [selfDone, setSelfDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<AccountProvider[]>([]);
  // 모든 연동 툴에서 실제 본인 계정 매핑이 저장된 경우에만 화면에 "완료"로 표시한다.
  // 계정 선택은 건너뛸 수 있으므로 최종 제출 조건에는 포함하지 않고, 표시 용도로만 쓴다.
  const [accountDone, setAccountDone] = useState(false);
  const [integrationsUnavailable, setIntegrationsUnavailable] = useState(false);
  const [integrationsRetryToken, setIntegrationsRetryToken] = useState(0);

  useEffect(() => {
    const projectId = Number(id);
    if (!Number.isFinite(projectId) || !id) return;
    let cancelled = false;
    setLoading(true);
    setAccountDone(false);
    Promise.all([
      fetchEvaluationTargets(projectId),
      fetchMySelfFeedback(projectId)
        .then(() => true)
        .catch((err) => {
          // 404 또는 EVAL400_3(백엔드 실제 미작성 응답) = 아직 자기 피드백을 작성하지 않은 정상 상태.
          // 그 외는 실제 조회 실패로 취급해 위 catch로 넘긴다.
          if (err instanceof ApiError && (err.status === 404 || err.code === 'EVAL400_3')) return false;
          throw err;
        }),
      getProjectIntegrations(id)
        .then((res) => ({ ok: true as const, res }))
        .catch(() => ({ ok: false as const, res: null })),
    ])
      .then(async ([targetsRes, selfDoneRes, integrationsResult]) => {
        if (cancelled) return;
        setTargets(targetsRes.targets);
        setSelfDone(selfDoneRes);
        setIntegrationsUnavailable(!integrationsResult.ok);

        const linked = integrationsResult.ok
          ? PROVIDER_ORDER.filter((p) =>
              integrationsResult.res.integrations.some(
                (item) => item.linkType === p.type && item.linked
              )
            ).map((p) => p.param)
          : [];
        setLinkedProviders(linked);

        if (linked.length > 0) {
          const mappings = await Promise.all(
            linked.map((provider) => getIntegrationActorMappings(id, provider).catch(() => null))
          );
          if (cancelled) return;
          const mappingsAvailable = mappings.every((res) => res !== null);
          if (!mappingsAvailable) {
            setIntegrationsUnavailable(true);
            return;
          }

          setAccountDone(
            mappings.every((res) =>
              res.mappings.some((mapping) => mapping.projectMemberId === res.currentProjectMemberId)
            )
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setNotice(err instanceof ApiError ? err.message : '평가 정보를 불러오지 못했어요. 다시 시도해 주세요.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, integrationsRetryToken]);

  // 자기 피드백과 "내 계정 선택"은 둘 다 선택 사항이라 진행률/제출 조건에서 제외한다.
  // 팀원 평가만 전부 마치면 최종 제출할 수 있다.
  const doneCount = targets.filter((t) => t.isEvaluated).length;
  const totalCount = targets.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const handleSubmit = () => {
    if (!allDone || !id) return;
    navigate(`/project/${id}/report`, { state: { justSubmitted: true } });
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

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-4">
        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h3 font-semibold text-gray-900">
            {allDone ? '모든 평가 완료' : '평가할 팀원을 선택하세요'}
          </h1>
          <p className="text-caption font-normal text-gray-400">
            {allDone
              ? '모든 팀원 평가가 완료되었습니다. 최종 제출해 주세요.'
              : '닉네임 기반 익명 평가 / 리포트 발행 후 실명 공개'}
          </p>
        </div>

        {/* 진행률 */}
        <div className="flex flex-col gap-2">
          <span className="self-end text-body-sm font-semibold text-primary">
            {doneCount} / {totalCount}명 평가 완료
          </span>
          <ProgressBar value={doneCount} max={totalCount} />
        </div>

        {/* 팀원 카드 목록 */}
        <div className="flex flex-col gap-3 py-3">
          {loading ? (
            <p className="text-body-sm text-gray-400 text-center py-6">불러오는 중...</p>
          ) : (
            targets.map((target) => (
              <div
                key={target.projectMemberId}
                className="bg-white border border-gray-100 rounded-2xl shadow-card px-5 py-4 flex items-center gap-3"
              >
                <PeerEvalAvatar profilePreset={target.profilePreset} size="sm" />
                <span className="flex-1 text-title leading-[28px] text-gray-900">{target.nickname}</span>
                {target.isEvaluated ? (
                  <span className={CARD_ACTION_DONE_CLASS}>완료</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${id}/peer-eval/${target.projectMemberId}/star`)}
                    className={cn(CARD_ACTION_CLASS, 'bg-primary text-gray-25 hover:bg-primary-600')}
                  >
                    평가하기
                  </button>
                )}
              </div>
            ))
          )}

          {/* 자기 피드백 카드 */}
          {!loading && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
              <PersonIcon />
              <div className="flex-1">
                <div className="flex h-8 items-center justify-between">
                  <span className="text-title leading-[28px] text-gray-900">자기 피드백</span>
                  {selfDone ? (
                    <span className={CARD_ACTION_DONE_CLASS}>완료</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/project/${id}/peer-eval/self`)}
                      className={cn(CARD_ACTION_CLASS, 'bg-primary text-gray-25 hover:bg-primary-600')}
                    >
                      작성하기
                    </button>
                  )}
                </div>
                <p className="text-caption font-normal leading-4 text-gray-400">
                  활동 로그로 파악하기 어려운
                  <br />
                  기여 맥락을 작성해 주세요
                </p>
              </div>
            </div>
          )}

          {/* 연동 상태 조회 실패 카드 - 재시도 전까지는 이유를 알 수 없는 채로 제출이 막히지 않도록 안내 */}
          {!loading && integrationsUnavailable && (
            <div className="bg-error/5 border border-error/30 rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
              <PersonIcon />
              <div className="flex-1">
                <span className="flex h-8 items-center text-title leading-[28px] text-gray-900">
                  내 계정 선택
                </span>
                <p className="text-caption font-normal leading-4 text-gray-400">
                  연동 상태를 확인하지 못했어요. 연동된 툴이 있다면 계정 선택 후 제출할 수 있어요.
                </p>
                <button
                  type="button"
                  onClick={() => setIntegrationsRetryToken((value) => value + 1)}
                  className={cn(
                    CARD_ACTION_CLASS,
                    'mt-3 bg-gray-25 border border-error text-error hover:bg-error/10',
                  )}
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* 내 계정 선택 카드 - 연동된 외부 툴이 있을 때만 노출 */}
          {!loading && !integrationsUnavailable && linkedProviders.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card px-5 py-4 flex items-start gap-3">
              <PersonIcon />
              <div className="flex-1">
                <div className="flex h-8 items-center justify-between">
                  <span className="text-title leading-[28px] text-gray-900">내 계정 선택</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/project/${id}/peer-eval/accounts/${linkedProviders[0]}`)}
                    className={cn(
                      CARD_ACTION_CLASS,
                      accountDone
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-gray-25 border border-primary text-primary hover:bg-primary-100',
                    )}
                  >
                    {accountDone ? '완료' : '연결하기'}
                  </button>
                </div>
                <p className="text-caption font-normal leading-4 text-gray-400">
                  신뢰도 높은 리포트 출력을 위해
                  <br />
                  본인 계정 선택이 필요해요
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 완료 상태 안내 박스 */}
        {allDone && (
          <InfoBox>
            <div className="text-caption text-primary leading-5">
              <p className="font-bold">제출 전 확인사항</p>
              <p className="font-normal">제출 후에는 수정이 불가합니다.</p>
              <p className="font-normal">전원 제출 완료 시 기여도 리포트가 자동으로 발행됩니다.</p>
            </div>
          </InfoBox>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        <button
          type="button"
          disabled={!allDone}
          onClick={handleSubmit}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            allDone
              ? 'bg-primary text-gray-25 hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {allDone ? '최종 제출하기' : '모든 평가 완료 후 제출 가능해요'}
        </button>
      </div>

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
