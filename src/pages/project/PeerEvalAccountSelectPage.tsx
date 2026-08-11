import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  getIntegrationActorMappings,
  getProjectIntegrations,
  saveMyActorMapping,
} from '../../api/projectApi';
import { ApiError } from '../../api/client';
import { AlertModal } from '../../components/Modal';
import { markAccountCheckDone } from '../../lib/peerEvalAccountCheck';
import githubIcon from '../../assets/integrations/github.svg';
import figmaIcon from '../../assets/integrations/figma.svg';
import notionIcon from '../../assets/integrations/notion-figma.png';
import docsIcon from '../../assets/integrations/google-docs.svg';
import slidesIcon from '../../assets/integrations/google-slides.svg';
import {
  isCollectionFinished,
  type IntegrationProviderActorResponse,
  type ProjectIntegrationType,
} from '../../types/project';

// actor-mappings API는 Google을 google-docs/google-slides로 분리해서 받는다.
type ProviderParam = 'github' | 'figma' | 'notion' | 'google-docs' | 'google-slides';

// 아이콘 에셋이 자체 배경(둥근 사각형)을 포함하고 있어, 타일을 거의 채우도록 크게 렌더링해야
// IntegrationConnectionPage와 동일한 룩이 된다 (Figma 실측: 63px 타일 안에 56~64px 로고)
const PROVIDER_CONFIG: Record<
  ProviderParam,
  { label: string; type: ProjectIntegrationType; icon: string; logoSize: number }
> = {
  github: { label: 'GitHub', type: 'GITHUB', icon: githubIcon, logoSize: 63 },
  figma: { label: 'Figma', type: 'FIGMA', icon: figmaIcon, logoSize: 56 },
  notion: { label: 'Notion', type: 'NOTION', icon: notionIcon, logoSize: 36 },
  'google-docs': { label: 'Google Docs', type: 'GOOGLE_DOCS', icon: docsIcon, logoSize: 38 },
  'google-slides': { label: 'Google Slides', type: 'GOOGLE_SLIDES', icon: slidesIcon, logoSize: 38 },
};

// 계정 매핑은 Google만 docs/slides로 나뉘어 순서대로 두 단계를 거친다.
const PROVIDER_ORDER: ProviderParam[] = ['github', 'figma', 'notion', 'google-docs', 'google-slides'];

// ── SVG 아이콘 ──────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="none" aria-hidden>
      <path d="M7 1L1 8L7 15" stroke="#161A20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#2186FB" strokeWidth="1.2" />
      <path d="M7.5 6.5v4" stroke="#2186FB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="4.5" r="0.75" fill="#2186FB" />
    </svg>
  );
}

function PersonAvatar() {
  return (
    <span className="size-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path
          d="M12.9375 17.0625C10.9792 15.1042 10 12.75 10 10C10 7.25 10.9792 4.89583 12.9375 2.9375C14.8958 0.979167 17.25 0 20 0C22.75 0 25.1042 0.979167 27.0625 2.9375C29.0208 4.89583 30 7.25 30 10C30 12.75 29.0208 15.1042 27.0625 17.0625C25.1042 19.0208 22.75 20 20 20C17.25 20 14.8958 19.0208 12.9375 17.0625ZM0 35V33C0 31.5833 0.365001 30.2817 1.095 29.095C1.825 27.9083 2.79333 27.0017 4 26.375C6.58333 25.0833 9.20833 24.115 11.875 23.47C14.5417 22.825 17.25 22.5017 20 22.5C22.75 22.4983 25.4583 22.8217 28.125 23.47C30.7917 24.1183 33.4167 25.0867 36 26.375C37.2083 27 38.1775 27.9067 38.9075 29.095C39.6375 30.2833 40.0017 31.585 40 33V35C40 36.375 39.5108 37.5525 38.5325 38.5325C37.5542 39.5125 36.3767 40.0017 35 40H5C3.625 40 2.44833 39.5108 1.47 38.5325C0.491666 37.5542 0.00166667 36.3767 0 35Z"
          fill="#FAFBFC"
        />
      </svg>
    </span>
  );
}

// ── 계정 행 ──────────────────────────────────────────────────────────────────

function ActorRow({
  actor,
  selected,
  disabled,
  onSelect,
}: {
  actor: IntegrationProviderActorResponse;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        // 목록이 스크롤될 때 행 높이가 눌리지 않도록 shrink-0을 준다
        'flex w-full shrink-0 items-center gap-3 rounded-2xl border px-[21px] py-[17px] transition-colors',
        selected ? 'border-primary bg-primary-50 shadow-card-selected' : 'border-gray-100 bg-transparent shadow-card',
        disabled && !selected && 'opacity-50',
      )}
    >
      <PersonAvatar />
      <span className="flex-1 text-left text-title text-gray-900 truncate">{actor.displayName}</span>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-[8px]',
          selected ? 'bg-select-gradient text-gray-25' : 'border border-gray-400',
        )}
      >
        {selected && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PeerEvalAccountSelectPage() {
  const { id, provider = 'github' } = useParams<{ id: string; provider: string }>();
  const navigate = useNavigate();
  const providerParam: ProviderParam = provider in PROVIDER_CONFIG ? (provider as ProviderParam) : 'github';
  const config = PROVIDER_CONFIG[providerParam];

  const [actors, setActors] = useState<IntegrationProviderActorResponse[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<ProviderParam[] | null>(null);
  const [loading, setLoading] = useState(true);
  // 조회 실패와 "수집된 활동이 없어 선택지가 비어있는" 정상 상태를 구분해 다른 안내를 띄운다
  const [loadFailed, setLoadFailed] = useState(false);
  // 계정 목록이 비었을 때 "아직 수집 중"과 "수집했는데 활동이 없음"을 구분해 안내한다.
  const [collecting, setCollecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    // provider가 바뀌면 이전 provider의 선택값이 새 provider에 실수로 저장되지 않도록 즉시 초기화한다
    setSelectedKey(null);
    setActors([]);
    setLoadFailed(false);

    Promise.all([
      getProjectIntegrations(id),
      // 매핑 조회는 활동이 한 번이라도 수집된 뒤에야 정상 응답한다. 아직 수집 전인 툴에서 실패했다고
      // 단계 전체를 막으면 연동해둔 툴을 건너뛰지도 못하고 흐름이 끊기므로, 계정 목록만 비운 채
      // 진행할 수 있게 둔다. 아래 catch로 가는 건 연동 상태 조회가 실패한 경우뿐이다.
      getIntegrationActorMappings(id, providerParam).catch(() => null),
    ])
      .then(([integrationsRes, mappingsRes]) => {
        if (cancelled) return;
        const linked = PROVIDER_ORDER.filter((p) =>
          integrationsRes.integrations.some(
            (item) => item.linkType === PROVIDER_CONFIG[p].type && item.linked
          )
        );
        setLinkedProviders(linked);
        setCollecting(!isCollectionFinished(integrationsRes.collectionJobStatus));
        const availableActors = mappingsRes?.availableProviderActors ?? [];
        setActors(availableActors);
        const mine = availableActors.find((actor) => actor.mappedByCurrentMember);
        setSelectedKey(mine?.actorKey ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadFailed(true);
          setNotice(err instanceof ApiError ? err.message : '연동 정보를 불러오지 못했어요. 다시 시도해 주세요.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, providerParam, retryToken]);

  const providerIndex = linkedProviders?.indexOf(providerParam) ?? -1;
  const isLast = linkedProviders !== null && providerIndex === linkedProviders.length - 1;
  const nextProvider = linkedProviders && providerIndex >= 0 ? linkedProviders[providerIndex + 1] : undefined;
  // 중간 단계의 "다음"은 계정을 골랐을 때만 누를 수 있다. 선택 없이 넘어가는 건 건너뛰기가 맡는다.
  // 마지막 단계의 "완료"는 건너뛰기가 비활성이라, 선택 여부로 잠그면 흐름을 빠져나갈 수 없어진다.
  const canSubmit = !loading && !submitting && (isLast || Boolean(selectedKey));

  const goToNextStep = () => {
    if (isLast || !nextProvider) {
      // 마지막 단계를 정상적으로 넘긴 경우에만 확인 완료로 기록한다. 전부 건너뛰면 서버에
      // 아무것도 남지 않아, 목록에서 "확인완료"를 보여주려면 이 기록이 필요하다.
      // 연동 상태 조회가 실패해 단계 목록을 모르는 채로 빠져나가는 경우(isLast=false)는 제외한다.
      if (id && isLast && linkedProviders) markAccountCheckDone(id, linkedProviders);
      navigate(`/project/${id}/peer-eval`);
    } else {
      navigate(`/project/${id}/peer-eval/accounts/${nextProvider}`);
    }
  };

  // 마지막 단계에서는 건너뛰기와 완료가 똑같이 목록으로 빠져나가 선택지가 다른 것처럼 보이고,
  // 계정을 골라둔 채 건너뛰기를 누르면 선택값이 저장되지 않은 채 넘어간다. 완료는 선택 여부와
  // 무관하게 항상 눌리므로 건너뛰기를 막아도 빠져나갈 길은 남는다.
  const canSkip = !submitting && !isLast;

  // 본인 계정을 찾지 못했거나 나중에 하고 싶은 경우를 위해, 매핑 저장 없이 다음 단계로 넘어간다.
  const handleSkip = () => {
    if (!id || !canSkip) return;
    goToNextStep();
  };

  const handleSubmit = async () => {
    if (!id || submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      if (selectedKey) {
        await saveMyActorMapping(id, providerParam, selectedKey);
      }
      goToNextStep();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : '계정을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden bg-gray-25">
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-6 border-b border-gray-100 bg-gray-25 px-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="shrink-0">
          <ChevronLeft />
        </button>
        <span className="text-title text-gray-900">내 계정 선택</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 flex flex-col gap-6">
        <div className="flex items-start gap-5">
          <span className="flex size-[63px] shrink-0 items-center justify-center">
            <img
              src={config.icon}
              alt=""
              className="object-contain"
              style={{ width: config.logoSize, height: config.logoSize }}
            />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold text-gray-900">{config.label} 연동</h1>
            <p className="text-caption text-gray-500 leading-4">
              해당 툴에서 사용한 자신의 계정을 선택해 주세요!
              <br />
              불이익 방지를 위해 본인의 계정을 정확히 선택해 주세요
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-body-sm text-gray-400 text-center py-6">불러오는 중...</p>
        ) : loadFailed ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-body-sm text-gray-400 text-center">계정 목록을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => setRetryToken((value) => value + 1)}
              className="rounded-full border border-primary px-3.5 py-2 text-body-sm text-primary hover:bg-primary-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : actors.length === 0 ? (
          <p className="text-body-sm text-gray-400 text-center py-6">
            {collecting
              ? `${config.label} 활동을 수집하고 있어요. 잠시 후 다시 확인해 주세요.`
              : `아직 수집된 ${config.label} 활동이 없어요. 건너뛰고 진행해도 괜찮아요.`}
          </p>
        ) : (
          /* 계정이 많아져도 페이지 전체가 길어지지 않도록, 시안 기준 4개 높이까지만 보이고
             나머지는 이 박스 안에서만 스크롤한다 */
          <div className="flex max-h-[393px] flex-col items-center gap-[23px] overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-transparent px-[22px] py-[25px] shadow-card">
            {actors.map((actor) => (
              <ActorRow
                key={actor.actorKey}
                actor={actor}
                selected={selectedKey === actor.actorKey}
                disabled={actor.mapped && !actor.mappedByCurrentMember}
                onSelect={() => setSelectedKey(actor.actorKey)}
              />
            ))}
          </div>
        )}

        <div className="bg-primary-50 rounded-12 px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <div className="text-caption text-primary leading-4">
            <p className="font-bold">안내</p>
            <p className="font-medium">선택한 계정 정보는 평가 리포트 생성에만 사용돼요</p>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 bg-white px-5 pb-[30px] pt-3.5">
        <div className="flex gap-4">
          <button
            type="button"
            disabled={!canSkip}
            onClick={handleSkip}
            className={cn(
              'h-14 flex-1 rounded-lg border text-[16px] font-bold leading-[24px] transition-colors',
              canSkip
                ? 'border-primary text-primary hover:bg-primary-50'
                : 'border-gray-200 text-gray-400 cursor-not-allowed',
            )}
          >
            건너뛰기
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className={cn(
              'h-14 flex-1 rounded-lg text-[16px] font-bold leading-[24px] transition-colors',
              canSubmit
                ? 'bg-primary text-gray-25 hover:bg-primary-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            {submitting ? '저장 중...' : isLast ? '완료' : '다음'}
          </button>
        </div>
      </div>

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
