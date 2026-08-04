import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createIntegrationAuthorization,
  disconnectIntegration,
  getIntegrationResources,
  getIntegrationStatus,
  getNotionResourceCandidates,
  issueGooglePickerAccessToken,
  registerFigmaResource,
  registerGoogleResource,
  registerNotionResource,
  removeIntegrationResource,
} from "../../api/integrationApi";
import { ApiError } from "../../api/client";
import { openBlankAuthWindow, waitForIntegrationLinked } from "../../lib/integrationAuth";
import { openGooglePicker } from "../../lib/googlePicker";
import { Modal } from "../../components/Modal";
import type { PermissionIconName } from "../../components/project/PermissionIcon";
import githubIcon from "../../assets/integrations/github.svg";
import figmaIcon from "../../assets/integrations/figma.svg";
import notionIcon from "../../assets/integrations/notion-figma.png";
import docsIcon from "../../assets/integrations/google-docs.svg";
import slidesIcon from "../../assets/integrations/google-slides.svg";
import docFileIcon from "../../assets/doc-file-icon.png";
import { IntegrationStepper } from "../../components/project/integration/IntegrationStepper";
import { IntegrationInfoBox } from "../../components/project/integration/IntegrationInfoBox";
import { IntegrationAccountRow } from "../../components/project/integration/IntegrationAccountRow";
import { IntegrationStartStep } from "../../components/project/integration/steps/IntegrationStartStep";
import { IntegrationAccountStep } from "../../components/project/integration/steps/IntegrationAccountStep";
import {
  IntegrationCompleteStep,
  IntegrationFileList,
} from "../../components/project/integration/steps/IntegrationCompleteStep";
import type { IntegrationResourceItem as ResourceItem } from "../../components/project/integration/integrationViewTypes";
import {
  getIntegrationStepLayout,
  type IntegrationProviderId as ProviderId,
} from "../../components/project/integration/integrationLayoutConfig";
import type {
  IntegrationLinkType,
  IntegrationProviderPath,
  IntegrationResourceCandidateResponse,
  IntegrationResourceResponse,
} from "../../types/integration";
import {
  useIntegrationStore,
  type IntegrationProvider,
} from "../../store/integrationStore";

type NotionFilter = "전체" | "페이지" | "DB";
type IntegrationNavigationState = {
  isConnected?: boolean;
  isMockConnected?: boolean;
  entryMode?: "disconnect" | "resources";
};

type Permission = {
  title: string;
  desc: string;
  icon: PermissionIconName;
};

type Provider = {
  name: string;
  icon: string;
  /** Figma 실측: 64px 타일 안에 들어가는 로고 크기 (GitHub 애셋은 타일 자체라 64) */
  tileLogo: number;
  tileIcon?: string;
  tileLogoWidth?: number;
  tileLogoHeight?: number;
  /** Figma 실측: 32px 타일(파일 목록) 안에 들어가는 로고 크기 */
  listLogo: number;
  description: string;
  account: string;
  accountType: string;
  /** step1 카드 안 "연동 안내" 불릿 */
  guide: string[];
  /** 하단 "안내" 박스 - Figma는 단계마다 문구가 다름 */
  notes: Record<number, string>;
  items: string[];
  permissions: Permission[];
};

/** 백엔드 Integration API가 연결된 provider */
const SERVER_PROVIDERS = ["github", "figma", "notion", "docs", "slides"] as const;
type ServerProviderId = (typeof SERVER_PROVIDERS)[number];

const PROVIDER_PATH: Record<ProviderId, IntegrationProviderPath> = {
  github: "github",
  figma: "figma",
  notion: "notion",
  docs: "google",
  slides: "google",
};

const LINK_TYPE: Record<ProviderId, IntegrationLinkType> = {
  github: "GITHUB",
  figma: "FIGMA",
  notion: "NOTION",
  docs: "GOOGLE",
  slides: "GOOGLE",
};

function isServerProviderId(value: ProviderId): value is ServerProviderId {
  return (SERVER_PROVIDERS as readonly string[]).includes(value);
}

const GITHUB_NOTE =
  "GitHub는 설치 과정에서 Repository를 선택하므로 Plog에서\n별도의 2차 선택 화면은 제공되지 않아요";
const GITHUB_ACCOUNT_NOTE =
  "GitHub는 설치 과정에서 Repository를 선택하므로 Plog에서\n별도의 2차 선택 화면은 제공되지 않아요";

/** step4(연동 완료) 안내 문구는 5개 서비스 공통 */
const COMPLETE_NOTE = "저장 후 데이터 수집이 시작돼요\n언제든지 설정에서 연동 내용 변경이 가능해요";

/** notion/docs/slides 공통 - 2차 선택이 있는 서비스의 step1 불릿 */
const SHARED_ONLY_GUIDE = ["공유된 페이지/데이터베이스만 조회돼요"];

const PROVIDERS: Record<ProviderId, Provider> = {
  github: {
    name: "GitHub",
    icon: githubIcon,
    tileLogo: 64,
    listLogo: 32,
    description: "GitHub 계정을 연결하려면 Repository, Issue,\nPR등 모든 데이터를 가져올 수 있습니다",
    account: "유재석",
    accountType: "GitHub 계정",
    guide: [
      "GitHub 공식 OAuth를 통해 안전하게 연결돼요",
      "모든 공개/비공개 Repository의 데이터를 가져올 수 있어요",
      "언제든지 연결 해제 및 재연결이 가능해요",
    ],
    notes: { 1: GITHUB_NOTE, 2: GITHUB_ACCOUNT_NOTE },
    items: ["Repository", "Issue", "Pull Request", "Commit", "User", "그 외 다수"],
    permissions: [
      { title: "Repository 정보 및 읽기", desc: "저장소 정보 및 파일, 브랜치, 태그 읽기", icon: "folder" },
      { title: "Issue / Pull Request 읽기", desc: "이슈 및 풀 리퀘스트 정보 읽기", icon: "pullRequest" },
      { title: "Commit / Review / Comment 수집", desc: "커밋, 코드 리뷰, 코멘트 정보 수집", icon: "code" },
      { title: "사용자 정보 읽기", desc: "사용자 기본 정보 읽기 (이름, 이메일, 프로필)", icon: "user" },
    ],
  },
  figma: {
    name: "Figma",
    icon: figmaIcon,
    tileLogo: 56,
    listLogo: 22,
    description: "Figma Design File URL을 등록하면,\n필요한 데이터를 자동으로 수집할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Figma 계정",
    guide: [
      "계정 연결 후 Figma Design File URL을 하나씩 추가 가능해요",
      "여러 파일을 점진적으로 등록하여 연동 범위 확장이 가능해요",
    ],
    notes: {
      1: "Figma는 Plog 내에서 파일을 미리 선택할 필요가 없어요\n계정을 먼저 연결한 후, 필요한 파일 URL을 등록해 주세요!",
      2: "다음 단계에서는 Figma 파일 URL을 등록해요\n여러 개의 Figma 파일 URL을 추가해 연동 가능해요",
      3: "Figma 파일에서 필요한 데이터를 수집할 수 있어요\n여러 파일 URL을 추가해 점진적으로 연동할 수 있어요",
    },
    items: ["파일 정보", "코멘트", "버전 이력", "댓글", "작성자 및 수정 메타데이터", "기타 활동 데이터"],
    permissions: [
      { title: "파일 정보 읽기", desc: "Figma 파일의 기본 정보 (이름, ID, 소유자 등)", icon: "folder" },
      { title: "버전 이력 수집", desc: "파일의 버전 이력과 변경 기록", icon: "history" },
      { title: "댓글 정보 읽기", desc: "파일 내 댓글 및 응답 정보 읽기", icon: "message" },
      { title: "필요한 메타데이터 수집", desc: "연동을 위해 필요한 메타데이터 수집", icon: "align" },
    ],
  },
  notion: {
    name: "Notion",
    icon: notionIcon,
    tileLogo: 36,
    listLogo: 16,
    description: "Notion 계정을 연결한 후, 분석할 페이지와\n데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Notion 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Notion은 연동 후 2차 설정이 필요해요\n워크스페이스 선택 후 페이지와 DB를 고를 수 있어요",
      2: "다음 단계에서 분석할 페이지와 DB를 선택해요",
      3: "생성자, 마지막 편집자, 댓글 정보를 수집할 수 있어요",
    },
    items: ["페이지/DB", "생성자", "최종 수정자", "댓글", "페이지/DB 참여 정보"],
    permissions: [
      { title: "공유된 페이지 읽기", desc: "연결된 워크스페이스에 공유된 페이지 정보 조회", icon: "document" },
      { title: "데이터베이스 읽기", desc: "공유된 데이터베이스 정보 조회", icon: "database" },
      { title: "생성자/최종 수정자", desc: "작성자 및 마지막 수정자 정보 수집", icon: "user" },
      { title: "댓글 정보 읽기", desc: "페이지 및 블록의 댓글 정보 조회", icon: "message" },
    ],
  },
  docs: {
    name: "Google Docs",
    icon: docsIcon,
    tileLogo: 38,
    tileIcon: docFileIcon,
    tileLogoWidth: 28,
    tileLogoHeight: 38,
    listLogo: 19,
    description: "Google 계정을 연결한 후, 분석할 페이지와\n데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Google Docs는 연동 후 2차 설정이 필요해요\n워크 스페이스 선택한 후 파일을 고를 수 있어요",
      2: "문서의 내용, 작성자, 마지막 수정자, 댓글 등을 수집할 수 있어요",
      3: "선택한 파일의 데이터만 수집하고있어요",
    },
    items: ["문서 파일", "생성자", "최종 수정자", "댓글", "최종 변경 이력"],
    permissions: [
      { title: "Google 문서 파일 조회 및 관리", desc: "선택한 문서 내용 수집", icon: "document" },
      { title: "문서 메타데이터 읽기", desc: "문서 이름, ID, 작성 정보 확인", icon: "database" },
      { title: "작성자/최종 수정자", desc: "작성자 및 마지막 수정자 정보 수집", icon: "user" },
      { title: "댓글 정보 읽기", desc: "문서의 댓글 및 토큰 정보 수집", icon: "message" },
    ],
  },
  slides: {
    name: "Google Slides",
    icon: slidesIcon,
    tileLogo: 39,
    listLogo: 19,
    description: "Google 계정을 연결한 후, 분석할 페이지와\n데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Google Slides는 연동 후 2차 설정이 필요해요\n워크 스페이스 선택한 후 파일을 고를 수 있어요",
      2: "슬라이드 내용, 작성자, 마지막 수정자, 댓글 등을 수집할 수 있어요",
      3: "선택한 파일의 데이터만 수집하고 있어요",
    },
    items: ["프레젠테이션 파일", "슬라이드 내용", "작성자", "댓글", "슬라이드 별 수정정보", "최종 변경 이력"],
    permissions: [
      { title: "프레젠테이션 파일 조회", desc: "선택한 Google Slides 파일의 기본 정보 조회", icon: "document" },
      { title: "슬라이드 내용 읽기", desc: "슬라이드 텍스트, 이미지, 도형 등 주요 내용 수집", icon: "database" },
      { title: "작성자/최종 수정자", desc: "파일 작성자 및 마지막 수정자 정보 수집", icon: "user" },
      { title: "댓글 정보 읽기", desc: "페이지 및 블록의 댓글 정보 조회", icon: "message" },
    ],
  },
};

function formatDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toResourceItem(resource: IntegrationResourceResponse): ResourceItem {
  const subtitle = () => {
    if (resource.resourceStatus === "REAUTH_REQUIRED") return "재인증이 필요해요";
    if (resource.resourceStatus === "DISABLED") return "접근할 수 없는 항목이에요";

    const modified = formatDateTime(resource.lastModifiedAt);
    if (modified) return `마지막 수정: ${modified}`;

    const collected = formatDateTime(resource.lastCollectedAt);
    return collected ? `마지막 수집: ${collected}` : "아직 수집되지 않았어요";
  };

  return { key: String(resource.resourceId), name: resource.resourceName, subtitle: subtitle() };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export default function IntegrationConnectionPage() {
  const { id = "", provider = "github" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const providerId = (provider in PROVIDERS ? provider : "github") as ProviderId;
  const config = PROVIDERS[providerId];
  const isServer = isServerProviderId(providerId);
  const providerPath = PROVIDER_PATH[providerId];
  const linkType = LINK_TYPE[providerId];
  const storeProvider: IntegrationProvider =
    providerId === "docs"
      ? "googleDocs"
      : providerId === "slides"
        ? "googleSlides"
        : (provider as Exclude<IntegrationProvider, "googleDocs" | "googleSlides">);
  const mockConnected = useIntegrationStore(
    (state) => state.projectAccounts[id]?.[storeProvider] ?? false
  );
  const connectMock = useIntegrationStore((state) => state.connectProject);
  const disconnectMock = useIntegrationStore((state) => state.disconnectProject);
  const navigationState = location.state as IntegrationNavigationState | null;
  const navigationConnected = navigationState?.isConnected;
  const navigationMockConnected = Boolean(navigationState?.isMockConnected);
  const navigationEntryMode = navigationState?.entryMode;
  const [isConnected, setIsConnected] = useState<boolean | null>(
    navigationConnected ?? null
  );
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(
    navigationConnected === true && navigationEntryMode !== "resources"
  );
  const [connectionLoadError, setConnectionLoadError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [step, setStep] = useState(() =>
    navigationConnected === true ? (providerId === "github" ? 4 : 3) : 1
  );
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState(() => {
    if (providerId === "docs") return ["프로젝트 도구", "시장 조사 보고서"];
    if (providerId === "slides") return ["중간 발표자료", "최최종 발표자료"];
    return ["연동된 파일 1", "연동된 파일 2"];
  });
  const [notionFilter, setNotionFilter] = useState<NotionFilter>("전체");

  /* 백엔드 연동 상태 */
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resources, setResources] = useState<IntegrationResourceResponse[]>([]);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<IntegrationResourceCandidateResponse[]>([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [notionQuery, setNotionQuery] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingResourceId, setRemovingResourceId] = useState<number | null>(null);
  const [isPickerOpening, setIsPickerOpening] = useState(false);
  const authAbortRef = useRef<AbortController | null>(null);

  const isGithub = providerId === "github";
  const isNotion = providerId === "notion";
  const isGooglePicker = providerId === "docs" || providerId === "slides";
  const currentStep = isGithub && step === 3 ? 4 : step;
  const actionLabel =
    currentStep === 1
      ? isAuthorizing
        ? "연결 중..."
        : "계정 연결"
      : currentStep === 2
        ? isGithub
          ? "저장"
          : "다음"
        : currentStep === 3
          ? isSaving
            ? "저장 중..."
            : "저장"
          : "확인";
  const connectionSubtitle =
    currentStep === 3
      ? providerId === "docs"
        ? "분석할 문서 선택"
        : providerId === "slides"
          ? "분석할 슬라이드 선택"
          : isNotion
            ? "분석할 페이지와 데이터베이스 선택"
            : `${config.name} 계정을 연결합니다`
      : isGithub
        ? "GitHub 계정을 연결하려면 Repository, Issue, PR등 모든 데이터를 가져올 수 있습니다"
        : isGooglePicker
        ? "Google 계정을 연결합니다"
        : `${config.name} 계정을 연결합니다`;
  const infoText = useMemo(
    () => (currentStep === 4 ? COMPLETE_NOTE : config.notes[currentStep] ?? config.notes[2]),
    [config.notes, currentStep]
  );
  const registeredResourceIds = useMemo(
    () => new Set(resources.map((resource) => resource.providerResourceId)),
    [resources]
  );
  const registeredResourcesByProviderId = useMemo(
    () => new Map(resources.map((resource) => [resource.providerResourceId, resource])),
    [resources]
  );
  const displayResources = useMemo(() => {
    if (providerId === "docs") {
      return resources.filter((resource) => resource.resourceType === "GOOGLE_DOCUMENT");
    }
    if (providerId === "slides") {
      return resources.filter((resource) => resource.resourceType === "GOOGLE_PRESENTATION");
    }
    return resources;
  }, [providerId, resources]);
  const resourceItems = useMemo(
    () =>
      isServer
        ? displayResources.map(toResourceItem)
        : files.map((file) => ({
            key: file,
            name: file,
            subtitle: "마지막 수정: 2026.06.21 10:30",
          })),
    [displayResources, files, isServer]
  );
  const accountLabel = isServer ? accountName ?? `${config.name} 계정` : config.account;
  const stepLayout = getIntegrationStepLayout(providerId, currentStep);
  const connectionCardHeightClass = stepLayout.cardClass;
  const infoHeightClass = stepLayout.infoHeightClass;
  const connectionCardPaddingClass = stepLayout.cardPaddingClass ?? "py-[24px]";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  useEffect(() => () => authAbortRef.current?.abort(), []);

  // 설정 목록에서 전달된 상태를 즉시 보여주고, 공통 Integration API로 서버 상태를 재검증한다.
  useEffect(() => {
    let active = true;

    if (navigationConnected === undefined) {
      setIsConnected(null);
    }
    setConnectionLoadError(null);

    void getIntegrationStatus(id)
      .then((status) => {
        if (!active) return;
        const integration = status.integrations.find((item) => item.linkType === linkType);
        const connected = Boolean(integration?.linked) || (!isServer && mockConnected);
        setAccountName(integration?.connectedAccountName ?? null);
        setIsConnected(connected);
        setIsDisconnectOpen(connected && navigationEntryMode !== "resources");
        if (connected) {
          setStep(isGithub ? 4 : 3);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (mockConnected) {
          setIsConnected(true);
          setIsDisconnectOpen(true);
          return;
        }
        setConnectionLoadError(getErrorMessage(error, "연동 상태를 확인하지 못했어요."));
      });

    return () => {
      active = false;
    };
  }, [id, isGithub, isServer, linkType, mockConnected, navigationConnected, navigationEntryMode]);

  const loadResources = useCallback(async () => {
    if (!isServer) return;

    try {
      const response = await getIntegrationResources(id, providerPath);
      setResources(response.resources);
      setResourceError(null);
    } catch (error) {
      // 등록된 리소스가 아직 없을 때 백엔드는 404를 반환한다. 선택 화면에서는 빈 목록으로 처리한다.
      if (error instanceof ApiError && error.status === 404) {
        setResources([]);
        setResourceError(null);
        return;
      }
      setResourceError(getErrorMessage(error, "등록된 항목을 불러오지 못했어요."));
    }
  }, [id, isServer, providerPath]);

  // 데이터 선택/완료 단계에서 서버에 등록된 수집 대상을 보여준다
  useEffect(() => {
    if (!isServer || currentStep < 3) return;
    void loadResources();
  }, [currentStep, isServer, loadResources]);

  // Notion 등록 후보는 검색어 기준으로 서버에서 조회한다
  useEffect(() => {
    if (!isNotion || currentStep !== 3) return;

    let active = true;
    const query = notionQuery.trim();
    setIsLoadingCandidates(true);

    const timer = setTimeout(() => {
      void getNotionResourceCandidates(id, query || undefined)
        .then((list) => {
          if (!active) return;
          setCandidates(list);
          setCandidateError(null);
        })
        .catch((error) => {
          if (!active) return;
          setCandidates([]);
          setCandidateError(getErrorMessage(error, "Notion 목록을 불러오지 못했어요."));
        })
        .finally(() => {
          if (active) setIsLoadingCandidates(false);
        });
    }, query ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentStep, id, isNotion, notionQuery]);

  const handleAuthorize = async () => {
    if (isAuthorizing) return;

    // 팝업 차단을 피하려면 연동 URL을 받기 전에 창부터 열어야 한다
    const authWindow = openBlankAuthWindow();
    const controller = new AbortController();
    authAbortRef.current = controller;
    setIsAuthorizing(true);
    setAuthError(null);

    try {
      const { authorization } = await createIntegrationAuthorization(id, providerPath);

      if (!authWindow) {
        // 팝업이 차단되면 현재 창을 승인 화면으로 보낸다 (콜백 처리는 서버 몫)
        window.location.href = authorization;
        return;
      }
      authWindow.location.href = authorization;

      const integration = await waitForIntegrationLinked({
        projectId: id,
        linkType,
        authWindow,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!integration) {
        setAuthError("계정 연결을 완료하지 못했어요. 승인 창에서 권한을 허용한 뒤 다시 시도해 주세요.");
        return;
      }

      authWindow.close();
      setAccountName(integration.connectedAccountName);
      setStep(2);
    } catch (error) {
      authWindow?.close();

      // 이미 연결된 프로젝트면 409 — 연결된 상태로 이어서 진행한다
      if (error instanceof ApiError && error.status === 409) {
        setStep(2);
        return;
      }
      setAuthError(getErrorMessage(error, "연동 URL을 발급받지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      if (!controller.signal.aborted) setIsAuthorizing(false);
    }
  };

  const handleRegisterFigmaUrl = async () => {
    const fileUrl = url.trim();
    if (!fileUrl || isRegistering) return;

    setIsRegistering(true);
    setSaveError(null);

    try {
      const resource = await registerFigmaResource(id, fileUrl);
      setResources((items) =>
        items.some((item) => item.resourceId === resource.resourceId) ? items : [...items, resource]
      );
      setUrl("");
    } catch (error) {
      setSaveError(
        error instanceof ApiError && error.status === 409
          ? "이미 등록된 Figma 파일이에요."
          : getErrorMessage(error, "Figma 파일을 등록하지 못했어요. URL을 확인해 주세요.")
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveFigmaResource = async (key: string) => {
    const resourceId = Number(key);
    if (!Number.isSafeInteger(resourceId) || removingResourceId !== null) return;

    setRemovingResourceId(resourceId);
    setSaveError(null);

    try {
      await removeIntegrationResource(id, "figma", resourceId);
      setResources((items) => items.filter((item) => item.resourceId !== resourceId));
      setResourceError(null);
    } catch (error) {
      setSaveError(getErrorMessage(error, "Figma 파일 연동을 해제하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setRemovingResourceId(null);
    }
  };

  const handleRemoveNotionResource = async (providerResourceId: string) => {
    const resource = registeredResourcesByProviderId.get(providerResourceId);
    if (!resource || removingResourceId !== null) return;

    setRemovingResourceId(resource.resourceId);
    setSaveError(null);

    try {
      await removeIntegrationResource(id, "notion", resource.resourceId);
      setResources((items) => items.filter((item) => item.resourceId !== resource.resourceId));
      setSelectedCandidates((items) => items.filter((item) => item !== providerResourceId));
      setResourceError(null);
    } catch (error) {
      setSaveError(getErrorMessage(error, "Notion 항목 연동을 해제하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setRemovingResourceId(null);
    }
  };

  const handleRemoveGoogleResource = async (key: string) => {
    const resourceId = Number(key);
    if (!Number.isSafeInteger(resourceId) || removingResourceId !== null) return;

    setRemovingResourceId(resourceId);
    setSaveError(null);

    try {
      await removeIntegrationResource(id, "google", resourceId);
      setResources((items) => items.filter((item) => item.resourceId !== resourceId));
      setResourceError(null);
    } catch (error) {
      setSaveError(getErrorMessage(error, "Google 파일 연동을 해제하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setRemovingResourceId(null);
    }
  };

  const handleOpenGooglePicker = async () => {
    if (!isGooglePicker || isPickerOpening) return;

    setIsPickerOpening(true);
    setSaveError(null);

    try {
      const pickerToken = await issueGooglePickerAccessToken(id);
      setAccountName(pickerToken.connectedAccountName);

      const selectedFile = await openGooglePicker(providerId, pickerToken.accessToken);
      if (!selectedFile) return;

      const resource = await registerGoogleResource(id, selectedFile.id);
      setResources((items) =>
        items.some((item) => item.resourceId === resource.resourceId) ? items : [...items, resource]
      );
      setResourceError(null);
    } catch (error) {
      setSaveError(getErrorMessage(error, "Google 파일을 선택하거나 등록하지 못했습니다."));
    } finally {
      setIsPickerOpening(false);
    }
  };

  const handleSaveNotionSelection = async () => {
    const targets = candidates.filter(
      (candidate) =>
        selectedCandidates.includes(candidate.providerResourceId) &&
        !registeredResourceIds.has(candidate.providerResourceId)
    );

    if (targets.length === 0 && resources.length === 0) {
      setSaveError("분석할 페이지나 데이터베이스를 1개 이상 선택해 주세요.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Notion API 재검증이 대상마다 일어나므로 순차 등록한다
      for (const target of targets) {
        const resource = await registerNotionResource(id, {
          resourceType: target.resourceType,
          providerResourceId: target.providerResourceId,
        });
        setResources((items) =>
          items.some((item) => item.resourceId === resource.resourceId) ? items : [...items, resource]
        );
      }
      setSelectedCandidates([]);
      setStep(4);
    } catch (error) {
      setSaveError(getErrorMessage(error, "선택한 항목을 등록하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setIsSaving(false);
    }
  };

  const next = () => {
    if (currentStep === 4) {
      if (!isServer) {
        if (isGooglePicker) {
          connectMock(id, "googleDocs");
          connectMock(id, "googleSlides");
        } else {
          connectMock(id, storeProvider);
        }
      }
      navigate(`/project/${id}/settings`);
      return;
    }

    if (isServer) {
      if (currentStep === 1) {
        void handleAuthorize();
        return;
      }
      if (currentStep === 2) {
        setStep(isGithub ? 4 : 3);
        return;
      }
      if (isNotion) {
        void handleSaveNotionSelection();
        return;
      }
      if (displayResources.length === 0) {
        setSaveError(
          isGooglePicker
            ? providerId === "docs"
              ? "Google Docs 파일을 1개 이상 선택해 주세요."
              : "Google Slides 파일을 1개 이상 선택해 주세요."
            : "Figma Design File URL을 1개 이상 등록해 주세요."
        );
        return;
      }
      setStep(4);
      return;
    }

    if (isGithub && currentStep === 2) setStep(4);
    else setStep((value) => value + 1);
  };

  /** 연동 해제를 취소하면 프로젝트 설정 화면으로 돌아간다 */
  const handleKeepConnection = () => {
    if (isDisconnecting) return;
    navigate(`/project/${id}/settings`);
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      if (!isServer && (navigationMockConnected || mockConnected)) {
        if (isGooglePicker) {
          disconnectMock(id, "googleDocs");
          disconnectMock(id, "googleSlides");
        } else {
          disconnectMock(id, storeProvider);
        }
        navigate(`/project/${id}/settings`, { replace: true });
        return;
      }
      await disconnectIntegration(id, providerPath);
      navigate(`/project/${id}/settings`, { replace: true });
    } catch (error) {
      setDisconnectError(getErrorMessage(error, "연동을 해제하지 못했어요. 다시 시도해 주세요."));
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (connectionLoadError) {
    return (
      <div className="app-shell flex min-h-svh flex-col items-center justify-center bg-gray-25 px-5 text-center">
        <p className="text-[15px] text-gray-600" role="alert">
          {connectionLoadError}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/project/${id}/settings`)}
          className="mt-4 rounded-[14px] bg-blue-500 px-5 py-3 text-white"
        >
          프로젝트 설정으로 돌아가기
        </button>
      </div>
    );
  }

  if (isConnected === null) {
    return (
      <div
        className="app-shell flex min-h-svh items-center justify-center bg-gray-25"
        role="status"
        aria-label="외부 툴 연동 상태 확인 중"
      >
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-svh bg-gray-25 pb-[116px]">
      <Modal
        open={isDisconnectOpen}
        onClose={isDisconnecting ? undefined : handleKeepConnection}
        contentClassName="h-[292px] max-w-[362px] rounded-[22px] px-6 pb-[26px] pt-[42px]"
      >
        <div className="flex h-full flex-col items-center text-center">
          <h2 className="text-[18px] font-semibold leading-[26px] text-gray-900">
            {isGooglePicker
              ? "Google Docs와 Google Slides 연동을 모두 해제하시겠습니까?"
              : `${config.name} 연동을 해제하시겠습니까?`}
          </h2>
          <p className="mt-8 text-[13px] leading-[21px] text-gray-400">
            연동된 툴의 활동 데이터가 기여도 분석에 자동 반영됩니다
            <br />
            연동을 해제하면 기여도 분석 정확도가 낮아질 수 있어요!
          </p>
          {disconnectError && (
            <p className="mt-3 text-[12px] text-error" role="alert">
              {disconnectError}
            </p>
          )}
          <div className="mt-auto grid w-full grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleKeepConnection}
              disabled={isDisconnecting}
              className="h-14 rounded-[14px] bg-gray-100 text-[16px] font-semibold text-gray-400 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={isDisconnecting}
              className="h-14 rounded-[14px] bg-error text-[16px] font-semibold text-white disabled:opacity-60"
            >
              {isDisconnecting ? "해제 중..." : "연동 해제"}
            </button>
          </div>
        </div>
      </Modal>
      <header className="flex h-[52px] items-center border-b border-gray-100 px-5 shadow-sm">
        <button type="button" aria-label="뒤로가기" onClick={() => navigate(`/project/${id}/settings`)} className="mr-3 flex h-6 w-6 items-center justify-center">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-[18px] font-semibold text-gray-900">{config.name} 연결</h1>
      </header>
      <IntegrationStepper step={currentStep} />

      <main className="px-5">
        <section className={`rounded-[16px] border border-gray-100 bg-white/[0.01] px-[21px] shadow-card ${connectionCardHeightClass} ${connectionCardPaddingClass}`}>
          {currentStep === 4 ? (
            <IntegrationCompleteStep
              isGithub={isGithub}
              isNotion={isNotion}
              resources={resources}
              resourceItems={resourceItems}
              icon={config.icon}
              logoSize={config.listLogo}
            />
          ) : (
            <>
              <div className="flex items-center border-b border-gray-100 pb-[23px]">
                <span className="flex h-[63px] w-[63px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                  <img
                    src={config.tileIcon ?? config.icon}
                    alt=""
                    className="object-contain"
                    style={{
                      width: config.tileLogoWidth ?? config.tileLogo,
                      height: config.tileLogoHeight ?? config.tileLogo,
                    }}
                  />
                </span>
                <div className="ml-5 min-w-0">
                  <h2 className="text-[18px] font-semibold text-gray-900">{config.name} 연동</h2>
                  <p className="mt-1 whitespace-pre-line text-[12px] leading-[18px] text-gray-400">{currentStep === 1 ? config.description : connectionSubtitle}</p>
                </div>
              </div>

              {currentStep === 1 && (
                <IntegrationStartStep
                  items={config.items}
                  guide={config.guide}
                  guideHeadingClass={stepLayout.guideHeadingClass ?? "mt-6"}
                  guideClass={stepLayout.guideClass ?? ""}
                  authError={authError}
                />
              )}

              {currentStep === 2 && (
                <IntegrationAccountStep
                  account={accountLabel}
                  accountType={config.accountType}
                  accountRowClass={stepLayout.accountRowClass}
                  permissions={config.permissions}
                />
              )}

              {currentStep === 3 && isNotion && (
                <>
                  <IntegrationAccountRow account={accountLabel} accountType={config.accountType} />
                  <div className="relative">
                    <input
                      aria-label="페이지 또는 DB 검색"
                      placeholder="페이지 / DB 검색"
                      value={notionQuery}
                      onChange={(event) => setNotionQuery(event.target.value)}
                      className="h-[49px] w-full rounded-[13px] border border-gray-100 bg-white pl-11 pr-4 text-[14px] outline-none focus:border-blue-500"
                    />
                    <Search className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" aria-hidden />
                  </div>
                  <div className="mt-[23px] flex gap-[9px]" role="group" aria-label="Notion 항목 카테고리">
                    {(["전체", "페이지", "DB"] as const).map((filter) => {
                      const active = notionFilter === filter;
                      return (
                        <button
                          key={filter}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setNotionFilter(filter)}
                          className={`flex h-8 items-center rounded-full border px-[18px] text-[13px] leading-[18px] ${
                            active
                              ? "border-transparent bg-blue-100 text-blue-500"
                              : "border-gray-200 text-gray-400"
                          }`}
                        >
                          {filter}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-[23px] rounded-[16px] border border-gray-100 bg-white px-[18px] shadow-card">
                    <div className="notion-selection-scroll h-[230px] overflow-y-scroll pr-[10px]">
                      {isLoadingCandidates && candidates.length === 0 ? (
                        <p className="flex h-full items-center justify-center text-[13px] text-gray-400">불러오는 중...</p>
                      ) : candidateError ? (
                        <p className="flex h-full items-center justify-center px-2 text-center text-[13px] text-error" role="alert">
                          {candidateError}
                        </p>
                      ) : (
                        (() => {
                          const visible = candidates.filter((candidate) => {
                            if (notionFilter === "전체") return true;
                            return notionFilter === "DB"
                              ? candidate.resourceType === "DATA_SOURCE"
                              : candidate.resourceType === "PAGE";
                          });

                          if (visible.length === 0) {
                            return (
                              <p className="flex h-full items-center justify-center px-2 text-center text-[13px] leading-[20px] text-gray-400">
                                연결한 워크스페이스에서 조회할 수 있는 항목이 없어요
                                <br />
                                Notion에서 Plog에 페이지를 공유했는지 확인해 주세요
                              </p>
                            );
                          }

                          return visible.map((candidate) => {
                            const registeredResource = registeredResourcesByProviderId.get(candidate.providerResourceId);
                            const registered = registeredResource !== undefined;
                            const selected = registered || selectedCandidates.includes(candidate.providerResourceId);
                            const isDatabase = candidate.resourceType === "DATA_SOURCE";
                            const isRemoving = removingResourceId === registeredResource?.resourceId;
                            return (
                              <button
                                key={candidate.providerResourceId}
                                type="button"
                                disabled={isRemoving}
                                onClick={() => {
                                  if (registered) {
                                    void handleRemoveNotionResource(candidate.providerResourceId);
                                    return;
                                  }
                                  setSelectedCandidates((items) =>
                                    items.includes(candidate.providerResourceId)
                                      ? items.filter((item) => item !== candidate.providerResourceId)
                                      : [...items, candidate.providerResourceId]
                                  );
                                }}
                                className="flex h-[57px] w-full items-center disabled:cursor-wait disabled:opacity-60"
                              >
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border ${selected ? "border-blue-500 bg-gradient-to-b from-blue-500 to-aqua-500 text-white" : "border-gray-400"}`}>
                                  {selected && <Check className="h-4 w-4" />}
                                </span>
                                <span className="ml-3 truncate text-left text-[15px] text-gray-700">{candidate.resourceName}</span>
                                <span className={`ml-auto shrink-0 rounded-full px-3 py-[5px] text-[12px] ${isDatabase ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>
                                  {isDatabase ? "DB" : "페이지"}
                                </span>
                              </button>
                            );
                          });
                        })()
                      )}
                    </div>
                    <p className="py-[17px] text-center text-[14px] font-semibold text-blue-500">
                      선택 {resources.length + selectedCandidates.length}개
                    </p>
                  </div>
                  {saveError && (
                    <p className="mt-3 text-[12px] leading-[18px] text-error" role="alert">
                      {saveError}
                    </p>
                  )}
                </>
              )}

              {currentStep === 3 && isGooglePicker && (
                <>
                  <IntegrationAccountRow account={accountLabel} accountType={config.accountType} />
                  <button
                    type="button"
                    onClick={() => void handleOpenGooglePicker()}
                    disabled={isPickerOpening}
                    className="flex h-[60px] w-full items-center rounded-[16px] border border-gray-100 bg-white px-[18px] text-[15px] text-gray-900 shadow-card"
                  >
                    {isPickerOpening ? "Google Picker 여는 중..." : "Google Picker 열기"}
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
                  </button>
                  {saveError && (
                    <p className="mt-3 text-[12px] leading-[18px] text-error" role="alert">
                      {saveError}
                    </p>
                  )}
                  <h3 className="mt-7 text-[14px] text-gray-700">선택된 문서 ({resourceItems.length})</h3>
                  <IntegrationFileList
                    icon={config.icon}
                    logoSize={config.listLogo}
                    items={resourceItems}
                    onRemove={isServer ? (key) => void handleRemoveGoogleResource(key) : (key) => setFiles((items) => items.filter((item) => item !== key))}
                    removingKey={removingResourceId === null ? null : String(removingResourceId)}
                  />
                </>
              )}

              {currentStep === 3 && !isNotion && !isGooglePicker && (
                <>
                  <IntegrationAccountRow account={accountLabel} accountType={config.accountType} />
                  <label className="block text-[14px] text-gray-700">
                    {config.name} {providerId === "figma" ? "Design File" : "파일"} URL
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://"
                      className="mt-3 h-14 w-full rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] outline-none focus:border-blue-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (isServer) {
                        void handleRegisterFigmaUrl();
                        return;
                      }
                      if (url.trim()) {
                        setFiles((items) => [...items, `연동된 파일 ${items.length + 1}`]);
                        setUrl("");
                      }
                    }}
                    disabled={isRegistering || !url.trim()}
                    className="mt-3 flex h-14 w-full items-center justify-center gap-4 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500 disabled:border-gray-200 disabled:text-gray-400"
                  >
                    <Plus className="h-5 w-5" /> {isRegistering ? "등록 중..." : "URL 등록"}
                  </button>
                  {(saveError || resourceError) && (
                    <p className="mt-3 text-[12px] leading-[18px] text-error" role="alert">
                      {saveError ?? resourceError}
                    </p>
                  )}
                  <h3 className="mt-7 text-[14px] text-gray-700">등록된 파일 ({resourceItems.length})</h3>
                  <IntegrationFileList
                    icon={config.icon}
                    logoSize={config.listLogo}
                    items={resourceItems}
                    onRemove={isServer ? (key) => void handleRemoveFigmaResource(key) : (key) => setFiles((items) => items.filter((item) => item !== key))}
                    removingKey={removingResourceId === null ? null : String(removingResourceId)}
                  />
                </>
              )}
            </>
          )}
        </section>

        <IntegrationInfoBox
          text={infoText}
          heightClass={infoHeightClass}
          textSizeClass={providerId === "slides" && currentStep === 2 ? "text-[11px]" : undefined}
        />
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid h-[92px] w-full max-w-mobile -translate-x-1/2 grid-cols-[123px_1fr] gap-[21px] border-t border-gray-100 bg-white px-5 pt-3">
        <button type="button" onClick={() => navigate(`/project/${id}/settings`)} className="h-14 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500">취소</button>
        <button
          type="button"
          onClick={next}
          disabled={isAuthorizing || isSaving}
          className="h-14 rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          {actionLabel}
        </button>
      </footer>
    </div>
  );
}

