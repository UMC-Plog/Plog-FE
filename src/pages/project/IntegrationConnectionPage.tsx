import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { disconnectProjectIntegration } from "../../api/projectApi";
import { ApiError } from "../../api/client";
import { Modal } from "../../components/Modal";
import { PermissionIcon } from "../../components/project/PermissionIcon";
import type { PermissionIconName } from "../../components/project/PermissionIcon";
import githubIcon from "../../assets/integrations/github.svg";
import githubUnlinkIcon from "../../assets/integrations/github-unlink.svg";
import figmaIcon from "../../assets/integrations/figma.svg";
import notionIcon from "../../assets/integrations/notion.png";
import docsIcon from "../../assets/integrations/google-docs.svg";
import slidesIcon from "../../assets/integrations/google-slides.svg";

type ProviderId = "github" | "figma" | "notion" | "docs" | "slides";
type NotionFilter = "전체" | "페이지" | "DB";

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

const NOTION_ITEMS = [
  { id: "project-plan", name: "프로젝트 기획서", type: "페이지" },
  { id: "meeting-notes", name: "회의록", type: "DB" },
  { id: "requirements", name: "요구사항 정의서", type: "페이지" },
  { id: "action-items", name: "회의 액션 아이템", type: "DB" },
  { id: "design-guide", name: "디자인 가이드", type: "페이지" },
  { id: "development-schedule", name: "개발 일정", type: "DB" },
] as const;

const GITHUB_NOTE =
  "GitHub는 설치 과정에서 Repository를 선택하므로 Plog에서 별도의 2차 선택 화면은 제공되지 않아요";

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
    description: "GitHub 계정을 연결하려면 Repository, Issue, PR등 모든 데이터를 가져올 수 있습니다",
    account: "유재석",
    accountType: "GitHub 계정",
    guide: [
      "GitHub 공식 OAuth를 통해 안전하게 연결돼요",
      "모든 공개/비공개 Repository의 데이터를 가져올 수 있어요",
      "언제든지 연결 해제 및 재연결이 가능해요",
    ],
    notes: { 1: GITHUB_NOTE, 2: GITHUB_NOTE },
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
    description: "Figma Design File URL을 등록하면, 필요한 데이터를 자동으로 수집할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Figma 계정",
    guide: [
      "계정 연결 후 Figma Design File URL을 하나씩 추가 가능해요",
      "여러 파일을 점진적으로 등록하여 연동 범위 확장이 가능해요",
    ],
    notes: {
      1: "Figma는 Plog 내에서 파일을 미리 선택할 필요가 없어요\n계정을 먼저 연결한 후, 필요한 파일 URL을 등록해 주세요!",
      2: "다음 단계에서는 Figma 파일 URL을 등록해요\n여러 개의 Figma 파일 URL을 추가해 연동 가능해요",
      3: "Figma 파일의 필요한 데이터를 수집할 수 있어요\n여러 파일 URL을 추가해 점진적으로 연동 가능해요",
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
    description: "Notion 계정을 연결한 후, 분석할 페이지와 데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Notion 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Notion은 연동 후 2차 설정이 필요해요\n워크 스페이스 선택 후 페이지와 DB를 고를 수 있어요",
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
    name: "Google docs",
    icon: docsIcon,
    tileLogo: 38,
    listLogo: 19,
    description: "Google 계정을 연결한 후, 분석할 페이지와 데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Google docs는 연동 후 2차 설정이 필요해요\n워크 스페이스 선택한 후 파일을 고를 수 있어요",
      2: "문서의 내용, 작성자, 마지막 수정자, 댓글 등을 수집할 수 있어요",
      3: "선택한 파일의 데이터만 수집하고 있어요",
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
    name: "Google slides",
    icon: slidesIcon,
    tileLogo: 39,
    listLogo: 19,
    description: "Google 계정을 연결한 후, 분석할 페이지와 데이터베이스를 선택할 수 있습니다",
    account: "plog@naver.com",
    accountType: "Google 계정",
    guide: SHARED_ONLY_GUIDE,
    notes: {
      1: "Google slides은 연동 후 2차 설정이 필요해요\n워크 스페이스 선택한 후 파일을 고를 수 있어요",
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

const STEPS = ["연동 시작", "계정 인증", "데이터 선택", "연동 완료"];

/** Figma: 원 중심 61.5 / 154.5 / 247.5 / 340.5 (간격 93) -> px-[15px] + 4등분 */
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex px-[15px] pb-[17px] pt-[24px]">
      {STEPS.map((label, index) => (
        <div key={label} className="relative flex flex-1 flex-col items-center">
          {index < 3 && <span className="absolute left-[66.6%] top-4 h-px w-[66.7%] border-t border-dashed border-gray-200" />}
          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[15px] ${
            step === index + 1 ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_0_3px_#D6E7FE]" : "border-gray-200 bg-gray-25 text-gray-400"
          }`}>
            {index + 1}
          </span>
          <span className={`mt-4 text-[12px] ${step === index + 1 ? "text-blue-500" : "text-gray-400"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Figma: 체크마크는 세로 그라데이션 #2186FB -> #07BCC5 */
function GradientCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden>
      <defs>
        <linearGradient id="plog-complete-check" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2186FB" />
          <stop offset="1" stopColor="#07BCC5" />
        </linearGradient>
      </defs>
      <path d="M20 6 9 17l-5-5" stroke="url(#plog-complete-check)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function IntegrationConnectionPage() {
  const { id = "", provider = "github" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const config = PROVIDERS[(provider in PROVIDERS ? provider : "github") as ProviderId];
  const isConnected = Boolean(
    (location.state as { isConnected?: boolean } | null)?.isConnected
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState(() => {
    if (provider === "docs") return ["프로젝트 도구", "시장 조사 보고서"];
    if (provider === "slides") return ["중간 발표자료", "최최종 발표자료"];
    return ["연동된 파일 1", "연동된 파일 2"];
  });
  const [notionSelected, setNotionSelected] = useState(["프로젝트 기획서", "회의록"]);
  const [notionFilter, setNotionFilter] = useState<NotionFilter>("전체");
  const isGithub = provider === "github";
  const isNotion = provider === "notion";
  const isGooglePicker = provider === "docs" || provider === "slides";
  const currentStep = isGithub && step === 3 ? 4 : step;
  const actionLabel = currentStep === 1 ? "계정 연결" : currentStep === 2 ? (isGithub ? "저장" : "다음") : currentStep === 3 ? "저장" : "확인";
  const connectionSubtitle =
    currentStep === 3
      ? provider === "docs"
        ? "분석할 문서 선택"
        : provider === "slides"
          ? "분석할 슬라이드 선택"
          : isNotion
            ? "분석할 페이지와 데이터베이스 선택"
            : `${config.name} 계정을 연결합니다`
      : isGooglePicker
        ? "Google 계정을 연결합니다"
        : `${config.name} 계정을 연결합니다`;
  const infoText = useMemo(
    () => (currentStep === 4 ? COMPLETE_NOTE : config.notes[currentStep] ?? config.notes[2]),
    [config.notes, currentStep]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const next = () => {
    if (currentStep === 4) {
      navigate(`/project/${id}/settings`);
      return;
    }
    if (isGithub && currentStep === 2) setStep(4);
    else setStep((value) => value + 1);
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      const apiProvider =
        provider === "docs" || provider === "slides" ? "google" : provider;
      await disconnectProjectIntegration(id, apiProvider);
      navigate(`/project/${id}/settings`, { replace: true });
    } catch (error) {
      setDisconnectError(
        error instanceof ApiError
          ? error.message
          : "연동을 해제하지 못했어요. 다시 시도해 주세요."
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="app-shell min-h-svh bg-gray-25 pb-[116px]">
      <Modal
        open={isConnected}
        onClose={isDisconnecting ? undefined : () => navigate(`/project/${id}/settings`)}
        contentClassName="max-w-[362px] rounded-[22px] px-6 pb-6 pt-8"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[18px] bg-white shadow-card">
            <img
              src={provider === "github" ? githubUnlinkIcon : config.icon}
              alt=""
              className="object-contain"
              style={{
                width: provider === "github" ? 54 : config.tileLogo,
                height: provider === "github" ? 54 : config.tileLogo,
              }}
            />
          </span>
          <h2 className="mt-5 text-[18px] font-semibold text-gray-900">
            {config.name} 연동을 해제하시겠습니까?
          </h2>
          <p className="mt-3 text-[13px] leading-5 text-gray-400">
            연동을 해제하면 해당 서비스의 데이터를 더 이상 수집하지 않아요.
            <br />
            기존에 수집된 활동 기록은 보존됩니다.
          </p>
          {disconnectError && (
            <p className="mt-3 text-[12px] text-error" role="alert">
              {disconnectError}
            </p>
          )}
          <div className="mt-7 grid w-full grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigate(`/project/${id}/settings`)}
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
      <Stepper step={currentStep} />

      <main className="px-5">
        <section className="rounded-[16px] border border-gray-100 bg-white/10 px-[21px] py-[24px] shadow-card">
          {currentStep === 4 ? (
            /* Figma: 카드 높이 고정(429) + 내용 세로 중앙 정렬. 목록이 있으면 카드가 늘어남 */
            <div className="flex min-h-[381px] flex-col items-center justify-center text-center">
              <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-blue-100">
                <GradientCheck />
              </span>
              <h2 className="mt-8 text-[22px] font-bold text-navy-700">계정 연동이 완료되었습니다!</h2>
              <p className="mt-4 text-[12px] leading-[18px] text-gray-400">선택한 외부 서비스의 데이터를 수집하여<br />분석을 시작할 수 있습니다</p>
              {isNotion ? (
                <div className="mt-7 w-full text-left">
                  <h3 className="text-[14px] text-gray-700">선택된 항목 ({notionSelected.length})</h3>
                  <NotionSelectedList selected={notionSelected} />
                </div>
              ) : !isGithub && (
                <div className="mt-7 w-full text-left">
                  <h3 className="text-[14px] text-gray-700">등록된 파일 ({files.length})</h3>
                  <FileList icon={config.icon} logoSize={config.listLogo} files={files} onRemove={(name) => setFiles((items) => items.filter((item) => item !== name))} />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-gray-100 pb-[23px]">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                  <img src={config.icon} alt="" className="object-contain" style={{ width: config.tileLogo, height: config.tileLogo }} />
                </span>
                <div className="ml-5 min-w-0">
                  <h2 className="text-[18px] font-semibold text-gray-900">{config.name} 연동</h2>
                  <p className="mt-1 text-[12px] leading-[18px] text-gray-400">{currentStep === 1 ? config.description : connectionSubtitle}</p>
                </div>
              </div>

              {currentStep === 1 && (
                <>
                  <h3 className="mt-6 text-[15px] text-gray-700">연동 시 가져오는 데이터</h3>
                  {/* Figma: 2번째 열이 x=235에서 시작 (카드 안쪽 42 기준 193px) */}
                  <div className="mt-3 grid grid-cols-[193px_1fr] gap-y-2">
                    {config.items.map((item) => <span key={item} className="flex items-center gap-2 text-[13px] text-gray-700"><CheckCircle2 className="h-[18px] w-[18px] shrink-0 fill-blue-500 text-white" />{item}</span>)}
                  </div>
                  <h3 className="mt-6 text-[15px] text-gray-700">연동 안내</h3>
                  <div className="mt-3 rounded-[12px] bg-blue-50 px-4 py-[13px] text-[12px] leading-5 text-gray-500">
                    {config.guide.map((line) => <p key={line}>· {line}</p>)}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <AccountRow account={config.account} accountType={config.accountType} />
                  <h3 className="text-[15px] text-gray-700">요청 권한</h3>
                  <div className="mt-3 rounded-[12px] border border-gray-200 px-[18px] py-[9px]">
                    {config.permissions.map(({ title, desc, icon }) => (
                      <div key={title} className="flex min-h-[56px] items-center gap-3">
                        {/* 아이콘 viewBox가 36px 원 좌표 그대로라 36px로 렌더하면 Figma와 동일 위치 */}
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50"><PermissionIcon name={icon} className="h-9 w-9 text-blue-500" /></span>
                        <div><p className="text-[12px] text-gray-700">{title}</p><p className="mt-1 text-[11px] text-gray-400">{desc}</p></div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {currentStep === 3 && isNotion && (
                <>
                  <AccountRow account={config.account} accountType={config.accountType} />
                  <div className="relative">
                    <input aria-label="페이지 또는 DB 검색" placeholder="페이지 / DB 검색" className="h-12 w-full rounded-[12px] border border-gray-100 bg-white pl-11 pr-4 text-[14px] outline-none focus:border-blue-500" />
                    <Search className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" aria-hidden />
                  </div>
                  <div className="mt-[21px] flex gap-[9px]" role="group" aria-label="Notion 항목 카테고리">
                    {(["전체", "페이지", "DB"] as const).map((filter) => {
                      const active = notionFilter === filter;
                      return (
                        <button
                          key={filter}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setNotionFilter(filter)}
                          className={`rounded-full border px-[18px] py-[6px] text-[13px] leading-[18px] ${
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
                  <div className="mt-6 rounded-[14px] border border-gray-100 bg-white px-[18px] shadow-card">
                    <div className="notion-selection-scroll h-[230px] overflow-y-scroll pr-[10px]">
                      {NOTION_ITEMS
                        .filter((item) => notionFilter === "전체" || item.type === notionFilter)
                        .map((item) => {
                        const selected = notionSelected.includes(item.name);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setNotionSelected((items) =>
                              items.includes(item.name) ? items.filter((name) => name !== item.name) : [...items, item.name]
                            )}
                            className="flex h-[58px] w-full items-center"
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border ${selected ? "border-blue-500 bg-gradient-to-b from-blue-500 to-aqua-500 text-white" : "border-gray-400"}`}>
                              {selected && <Check className="h-4 w-4" />}
                            </span>
                            <span className="ml-3 text-[15px] text-gray-700">{item.name}</span>
                            <span className={`ml-auto rounded-full px-3 py-[5px] text-[12px] ${item.type === "DB" ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>{item.type}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="py-[17px] text-center text-[14px] font-semibold text-blue-500">선택 {notionSelected.length}개</p>
                  </div>
                </>
              )}

              {currentStep === 3 && isGooglePicker && (
                <>
                  <AccountRow account={config.account} accountType={config.accountType} />
                  <button
                    type="button"
                    className="flex h-[60px] w-full items-center rounded-[16px] border border-gray-100 bg-white px-[18px] text-[15px] text-gray-900 shadow-card"
                  >
                    Google Picker 열기
                    <ChevronRight className="ml-auto h-5 w-5 text-gray-400" />
                  </button>
                  <h3 className="mt-7 text-[14px] text-gray-700">선택된 문서 ({files.length})</h3>
                  <FileList icon={config.icon} logoSize={config.listLogo} files={files} onRemove={(name) => setFiles((items) => items.filter((item) => item !== name))} />
                </>
              )}

              {currentStep === 3 && !isNotion && !isGooglePicker && (
                <>
                  <AccountRow account={config.account} accountType={config.accountType} />
                  <label className="block text-[14px] text-gray-700">
                    {config.name} {provider === "figma" ? "Design File" : "파일"} URL
                    <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" className="mt-3 h-14 w-full rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] outline-none focus:border-blue-500" />
                  </label>
                  <button type="button" onClick={() => { if (url.trim()) { setFiles((items) => [...items, `연동된 파일 ${items.length + 1}`]); setUrl(""); } }} className="mt-3 flex h-14 w-full items-center justify-center gap-4 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500">
                    <Plus className="h-5 w-5" /> URL 등록
                  </button>
                  <h3 className="mt-7 text-[14px] text-gray-700">등록된 파일 ({files.length})</h3>
                  <FileList icon={config.icon} logoSize={config.listLogo} files={files} onRemove={(name) => setFiles((items) => items.filter((item) => item !== name))} />
                </>
              )}
            </>
          )}
        </section>

        <div className="mt-6 flex gap-3 rounded-[12px] bg-blue-50 px-[18px] py-3 text-[12px] leading-[18px] text-blue-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong className="font-semibold">안내</strong><br />{infoText.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid h-[92px] w-full max-w-mobile -translate-x-1/2 grid-cols-[123px_1fr] gap-[21px] border-t border-gray-100 bg-white px-5 pt-3">
        <button type="button" onClick={() => navigate(`/project/${id}/settings`)} className="h-14 rounded-[14px] border border-blue-500 text-[16px] font-semibold text-blue-500">취소</button>
        <button type="button" onClick={next} className="h-14 rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white">{actionLabel}</button>
      </footer>
    </div>
  );
}

function AccountRow({ account, accountType }: { account: string; accountType: string }) {
  return (
    <div className="flex items-center py-[22px]">
      <div className="ml-[58px]">
        <p className="text-[18px] text-gray-900">{account}</p>
        <p className="mt-1 text-[12px] text-gray-400">{accountType}</p>
      </div>
      <span className="ml-auto rounded-full bg-[#E9F8F0] px-[14px] py-[5px] text-[12px] text-success">계정 확인</span>
    </div>
  );
}

function NotionSelectedList({ selected }: { selected: string[] }) {
  return (
    <div className="mt-3 rounded-[14px] border border-gray-100 bg-white px-[18px] shadow-card">
      {selected.map((name, index) => (
        <div key={`${name}-${index}`} className="flex h-[58px] items-center">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-b from-blue-500 to-aqua-500 text-white">
            <Check className="h-4 w-4" />
          </span>
          <span className="ml-3 text-[14px] text-gray-700">{name}</span>
          <span className={`ml-auto rounded-full px-3 py-[5px] text-[12px] ${index === 1 ? "bg-aqua-50 text-aqua-500" : "bg-blue-50 text-blue-500"}`}>
            {index === 1 ? "DB" : "페이지"}
          </span>
        </div>
      ))}
    </div>
  );
}

function FileList({ icon, logoSize, files, onRemove }: { icon: string; logoSize: number; files: string[]; onRemove: (name: string) => void }) {
  return (
    <div className="mt-3 rounded-[14px] border border-gray-100 bg-white px-[18px] shadow-card">
      {files.map((file) => (
        <div key={file} className="flex h-[61px] items-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white"><img src={icon} alt="" className="object-contain" style={{ width: logoSize, height: logoSize }} /></span>
          <div className="ml-3"><p className="text-[12px] text-gray-700">{file}</p><p className="mt-1 text-[11px] text-gray-400">마지막 수정: 2026.06.21 10:30</p></div>
          <button type="button" aria-label={`${file} 삭제`} onClick={() => onRemove(file)} className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
        </div>
      ))}
    </div>
  );
}
