import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fetchEvaluationTargets, fetchMySelfFeedback, type TargetMember } from '../../api/evaluation';
import { getIntegrationActorMappings, getProjectIntegrations } from '../../api/projectApi';
import { collectIntegrationData } from '../../api/integrationApi';
import { ApiError } from '../../api/client';
import { AlertModal } from '../../components/Modal';
import { isCollectionFinished, type ProjectIntegrationType } from '../../types/project';
import { PeerEvalAvatar } from '../../components/PeerEvalAvatar';
import { isAccountCheckDone } from '../../lib/peerEvalAccountCheck';

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

// 수집 소요 시간은 provider별 활동량과 rate limit에 따라 크게 달라진다. 초반엔 자주 확인해
// 빨리 반응하고, 길어지면 간격을 늘려 불필요한 요청을 줄인다.
const POLL_START_MS = 2000;
const POLL_MAX_MS = 15000;
// 429는 서버가 자동 재시도하므로 수집이 길어지는 것을 실패로 단정하면 안 된다. 원칙은 종료
// 상태가 될 때까지 계속 보는 것이고, 이 상한은 잡이 끝나지 않은 채 방치될 때를 막는 안전장치다.
// 실제로는 화면을 벗어나면 폴링이 멈추므로 상한을 길게 둬도 요청이 쌓이지 않는다.
const POLL_TIMEOUT_MS = 30 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  // 계정 선택은 전부 건너뛸 수 있어 최종 제출 조건에는 넣지 않고, 배지 표시에만 쓴다.
  // selected = 계정을 하나 이상 골라 서버에 매핑이 남음 / checked = 끝까지 진행했지만 전부 건너뜀
  const [accountStatus, setAccountStatus] = useState<'none' | 'checked' | 'selected'>('none');
  const [integrationsUnavailable, setIntegrationsUnavailable] = useState(false);
  const [integrationsRetryToken, setIntegrationsRetryToken] = useState(0);
  // 외부 활동 수집이 진행 중인지. "고를 계정이 아직 없다"와 "기다리면 채워진다"를 구분해 보여준다.
  const [collecting, setCollecting] = useState(false);
  // 수집은 프로젝트당 한 번만 시작한다. 수집 완료 후 목록을 다시 불러올 때 재호출되면 안 된다.
  const collectionStartedRef = useRef(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  // 프로젝트가 바뀌면 수집 시작 이력도 초기화한다.
  useEffect(() => {
    collectionStartedRef.current = false;
  }, [id]);

  // 수집은 수동 호출 방식이라 아무도 부르지 않으면 계정 목록이 영원히 비어 있다.
  // 서버의 자동 수집(finalCollection)은 프로젝트 완료 후에 돌아 계정 매핑 시점에는 늦다.
  // shouldStart=false는 이미 돌고 있는 잡의 완료만 기다리는 경우다.
  const runCollection = useCallback(
    async (shouldStart: boolean) => {
      if (!id) return;
      setCollecting(true);
      try {
        // 진행 중인 잡이 있으면 서버가 새로 만들지 않고 기존 잡 ID를 돌려주므로,
        // 팀원 여러 명이 동시에 들어와도 중복 수집은 생기지 않는다.
        if (shouldStart) {
          // 시작에 실패했으면 기다릴 잡이 없다. 폴링해봐야 상태가 바뀌지 않으므로 바로 끝낸다.
          const started = await collectIntegrationData(id).then(
            () => true,
            () => false
          );
          if (!started) return;
        }

        const startedAt = Date.now();
        let delay = POLL_START_MS;
        while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
          await sleep(delay);
          if (!activeRef.current) return;

          const res = await getProjectIntegrations(id).catch(() => null);
          if (!activeRef.current) return;

          if (res && isCollectionFinished(res.collectionJobStatus)) {
            // 수집된 계정으로 매핑 상태를 다시 계산해야 하므로 목록 전체를 재조회한다.
            setIntegrationsRetryToken((value) => value + 1);
            return;
          }
          delay = Math.min(Math.round(delay * 1.5), POLL_MAX_MS);
        }
      } finally {
        if (activeRef.current) setCollecting(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const projectId = Number(id);
    if (!Number.isFinite(projectId) || !id) return;
    let cancelled = false;
    setLoading(true);
    setAccountStatus('none');
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
          // 매핑 조회는 활동이 한 번이라도 수집된 뒤에야 정상 응답한다. 아직 수집 전인 툴에서
          // 실패해도 연동 자체는 되어 있으므로 카드를 숨기지 않고, 배지 판정에서만 빠지게 둔다.
          // (예전에는 하나라도 실패하면 카드를 통째로 감춰, 로그 없는 툴 하나 때문에
          //  나머지 연동 툴까지 보이지 않았다.)
          const hasMapping = mappings.some(
            (res) =>
              res?.mappings.some((mapping) => mapping.projectMemberId === res.currentProjectMemberId) ??
              false
          );
          setAccountStatus(hasMapping ? 'selected' : isAccountCheckDone(id) ? 'checked' : 'none');

          // 수집을 시작하거나 지켜봐야 하는 경우:
          //   null    아직 한 번도 안 함        → 호출
          //   FAILED  실패했으니 다시 시도       → 호출 (재시도 버튼 대신 재진입으로 처리)
          //   진행 중  이미 돌고 있음            → 호출 없이 완료만 기다림
          // SUCCEEDED / PARTIAL_FAILED는 쓸 데이터가 있으므로 건드리지 않는다.
          // await하지 않아야 목록 로딩이 수집을 기다리지 않는다.
          const jobStatus = integrationsResult.ok
            ? integrationsResult.res.collectionJobStatus
            : null;
          // 잡 상태만 보면 "예전에 다른 툴을 수집해 SUCCEEDED로 남았는데 그 뒤에 새로 연동한
          // 툴은 한 번도 수집되지 않은" 경우를 놓친다. provider별 상태까지 확인한다.
          const hasUncollectedProvider = integrationsResult.ok
            ? integrationsResult.res.integrations.some(
                (item) => item.linked && item.collectionStatus === 'NOT_STARTED'
              )
            : false;
          // 새 잡을 만들어야 하는 경우와, 이미 도는 잡의 완료만 기다리면 되는 경우를 구분한다.
          const shouldStart =
            jobStatus === null || jobStatus === 'FAILED' || hasUncollectedProvider;
          const needsCollection = shouldStart || !isCollectionFinished(jobStatus);
          if (needsCollection && !collectionStartedRef.current) {
            collectionStartedRef.current = true;
            void runCollection(shouldStart);
          }
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
  }, [id, integrationsRetryToken, runCollection]);

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
        {/* 진입 경로가 리포트 탭·자기 피드백·계정 선택 등으로 여러 갈래라, navigate(-1)이면 방금
            작성을 마친 화면으로 되돌아간다. 이 화면에서는 항상 홈으로 보낸다. */}
        <button type="button" onClick={() => navigate('/home')} aria-label="뒤로" className="shrink-0">
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
                      accountStatus === 'none'
                        ? 'bg-gray-25 border border-primary text-primary hover:bg-primary-100'
                        : 'bg-success/10 text-success hover:bg-success/20',
                    )}
                  >
                    {accountStatus === 'selected'
                      ? '선택완료'
                      : accountStatus === 'checked'
                        ? '확인완료'
                        : '연결하기'}
                  </button>
                </div>
                <p className="text-caption font-normal leading-4 text-gray-400">
                  {collecting ? (
                    '활동을 수집하고 있어요. 잠시 후 계정을 선택할 수 있어요'
                  ) : (
                    <>
                      신뢰도 높은 리포트 출력을 위해
                      <br />
                      본인 계정 선택이 필요해요
                    </>
                  )}
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
