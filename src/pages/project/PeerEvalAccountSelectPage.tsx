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
import githubIcon from '../../assets/integrations/github.svg';
import figmaIcon from '../../assets/integrations/figma.svg';
import notionIcon from '../../assets/integrations/notion.png';
import googleIcon from '../../assets/integrations/google-docs.svg';
import type { IntegrationProviderActorResponse, ProjectIntegrationType } from '../../types/project';

type ProviderParam = 'github' | 'figma' | 'notion' | 'google';

// 아이콘 에셋이 자체 배경(둥근 사각형)을 포함하고 있어, 타일을 거의 채우도록 크게 렌더링해야
// IntegrationConnectionPage와 동일한 룩이 된다 (Figma 실측: 63px 타일 안에 56~64px 로고)
const PROVIDER_CONFIG: Record<
  ProviderParam,
  { label: string; type: ProjectIntegrationType; icon: string; logoSize: number }
> = {
  github: { label: 'GitHub', type: 'GITHUB', icon: githubIcon, logoSize: 63 },
  figma: { label: 'Figma', type: 'FIGMA', icon: figmaIcon, logoSize: 56 },
  notion: { label: 'Notion', type: 'NOTION', icon: notionIcon, logoSize: 36 },
  google: { label: 'Google', type: 'GOOGLE', icon: googleIcon, logoSize: 38 },
};

// 백엔드가 GITHUB, FIGMA, NOTION, GOOGLE 순서로 연동 상태를 내려주는 것과 동일한 순회 순서
const PROVIDER_ORDER: ProviderParam[] = ['github', 'figma', 'notion', 'google'];

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
        'flex w-full items-center gap-3 rounded-2xl border px-[21px] py-[17px] shadow-card transition-colors',
        selected ? 'border-primary bg-primary-50' : 'border-gray-100 bg-white',
        disabled && !selected && 'opacity-50',
      )}
    >
      <PersonAvatar />
      <span className="flex-1 text-left text-title text-gray-900 truncate">{actor.displayName}</span>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-lg border',
          selected ? 'border-primary bg-primary text-gray-25' : 'border-gray-400',
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
  // 목록 조회 자체가 실패했을 때는 "선택지가 없어서 건너뛰기 가능"과 구분해야 한다 (실패 시에는 건너뛰기 불가)
  const [loadFailed, setLoadFailed] = useState(false);
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
      getIntegrationActorMappings(id, providerParam),
    ])
      .then(([integrationsRes, mappingsRes]) => {
        if (cancelled) return;
        const linked = PROVIDER_ORDER.filter((p) =>
          integrationsRes.integrations.some((item) => item.linkType === PROVIDER_CONFIG[p].type && item.linked)
        );
        setLinkedProviders(linked);
        setActors(mappingsRes.availableProviderActors);
        const mine = mappingsRes.availableProviderActors.find((actor) => actor.mappedByCurrentMember);
        setSelectedKey(mine?.actorKey ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadFailed(true);
          setNotice(err instanceof ApiError ? err.message : '계정 목록을 불러오지 못했어요. 다시 시도해 주세요.');
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
  // 수집된 활동이 없다고 "확인된" 경우에만 매핑 없이 다음 단계로 넘어갈 수 있다 (조회 실패 시엔 재시도해야 함)
  const canSkip = !loading && !loadFailed && actors.length === 0;
  const canSubmit = !loading && !submitting && (canSkip || Boolean(selectedKey));

  const handleSubmit = async () => {
    if (!id || submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      if (selectedKey) {
        await saveMyActorMapping(id, providerParam, selectedKey);
      }
      if (isLast || !nextProvider) {
        navigate(`/project/${id}/peer-eval`);
      } else {
        navigate(`/project/${id}/peer-eval/accounts/${nextProvider}`);
      }
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : '계정을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-25">
      <header className="sticky top-0 z-10 bg-gray-25 border-b border-gray-100 h-14 px-6 flex items-center gap-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로" className="shrink-0">
          <ChevronLeft />
        </button>
        <span className="text-title text-gray-900">내 계정 선택</span>
      </header>

      <div className="flex-1 px-5 pt-6 pb-28 flex flex-col gap-6">
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
            아직 수집된 {config.label} 활동이 없어요. 데이터 수집 후 다시 시도해 주세요.
          </p>
        ) : (
          <div className="flex flex-col gap-[10px] rounded-2xl border border-gray-100 bg-white/10 px-[11px] py-[13px] shadow-card">
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

        <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-start gap-3">
          <InfoIcon />
          <div className="text-caption text-primary leading-4">
            <p className="font-bold">안내</p>
            <p className="font-medium">선택한 계정 정보는 평가 리포트 생성에만 사용돼요</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white px-5 pt-3 pb-8">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className={cn(
            'w-full h-14 rounded-lg text-body font-bold transition-colors',
            canSubmit
              ? 'bg-primary text-gray-25 hover:bg-primary-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {submitting ? '저장 중...' : isLast ? '완료' : '다음'}
        </button>
      </div>

      <AlertModal open={Boolean(notice)} title={notice ?? ''} onConfirm={() => setNotice(null)} />
    </div>
  );
}
