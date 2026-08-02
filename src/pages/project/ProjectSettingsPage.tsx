import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Link2, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useNavigate, useParams } from "react-router-dom";
import { createProjectInvitationUrl } from "../../lib/projectInvitation";
import {
  getProjectSettings,
  isOwnerMustTransferError,
  leaveProject,
  toApiProjectType,
  updateProjectSettings,
} from "../../api/projectApi";
import { ApiError } from "../../api/client";
import githubIcon from "../../assets/integrations/github.svg";
import figmaIcon from "../../assets/integrations/figma.svg";
import notionIcon from "../../assets/integrations/notion.png";
import docsIcon from "../../assets/integrations/google-docs.svg";
import slidesIcon from "../../assets/integrations/google-slides.svg";
import { Modal } from "../../components/Modal";
import { DateDropdownSelect } from "../../components/DateDropdownSelect";
import { useProjectStore } from "../../store/projectStore";
import {
  useIntegrationStore,
  type IntegrationProvider,
} from "../../store/integrationStore";
import type {
  ProjectIntegrationType,
  ProjectSettingsResponse,
  ProjectType,
} from "../../types/project";
import { getDaysFromToday } from "../../lib/projectDate";

const INTEGRATIONS = [
  { id: "github", label: "GitHub", icon: githubIcon, logo: 32, type: "GITHUB" },
  { id: "figma", label: "Figma", icon: figmaIcon, logo: 22, type: "FIGMA" },
  { id: "notion", label: "Notion", icon: notionIcon, logo: 16, type: "NOTION" },
  { id: "docs", label: "Google docs", icon: docsIcon, logo: 19, type: "GOOGLE" },
  { id: "slides", label: "Google slides", icon: slidesIcon, logo: 19, type: "GOOGLE" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: string;
  logo: number;
  type: ProjectIntegrationType;
}>;

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

function splitEndDate(value: string): [string, string, string] {
  const [year, month, day] = value.split("-");
  return [year, month, day];
}

function toUiProjectType(type: ProjectSettingsResponse["projectType"]): ProjectType {
  return type === "DEVELOP" ? "DEVELOPMENT" : "GENERAL";
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "네트워크 상태를 확인하고 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "PROJECT_NOT_FOUND":
    case "PROJECT001":
      return "존재하지 않는 프로젝트예요.";
    case "PROJECT_MEMBER_REQUIRED":
    case "PROJECT002":
      return "프로젝트에 접근할 권한이 없어요.";
    case "PROJECT_SETTING_PERMISSION_DENIED":
    case "PROJECT003":
      return "프로젝트 설정은 방장만 변경할 수 있어요.";
    case "VALIDATION_ERROR":
    case "PROJECT004":
    case "PROJECT005":
    case "E400_INVALID_DATE":
      return "프로젝트명과 예상 종료일을 확인해 주세요.";
    case "OWNER_MUST_TRANSFER":
      return "프로젝트 생성자는 다른 팀원에게 방장 권한을 이전해야 나갈 수 있어요.";
    case "PROJECT_ACTIVE_MEMBER_REQUIRED":
    case "ACTIVE_MEMBER_REQUIRED":
      return "이미 나갔거나 참여 중이 아닌 프로젝트예요.";
    default:
      return error.message || "요청을 처리하지 못했어요.";
  }
}

function isValidDate(year: string, month: string, day: string) {
  const value = `${year}-${month}-${day}`;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // 권한이 없거나 보안 컨텍스트가 아닌 환경에서는 아래 fallback을 사용한다.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("클립보드 복사에 실패했습니다.");
}

function ProjectLeaveDialog({
  open,
  isLeaving,
  errorMessage,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  isLeaving: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={isLeaving ? undefined : onCancel}
      contentClassName="max-w-[362px] rounded-[22px] px-6 pb-[26px] pt-[42px]"
    >
      {/* 실패 메시지가 붙으면 아래로 늘어나도록 고정 높이 대신 최소 높이(436px - 상하 패딩)를 쓴다. */}
      <div className="flex min-h-[368px] flex-col">
        <h2 className="text-center text-[18px] font-semibold leading-[26px] text-gray-900">
          프로젝트에서 나가시겠습니까?
        </h2>

        <ul className="mt-[38px] space-y-[18px] pl-4 text-[13px] leading-[21px] text-gray-400">
          <li className="list-disc pl-1">
            프로젝트에서 나가면 내 프로젝트 목록에서 즉시 사라지며, 이후 해당 프로젝트의
            자료, 활동 기록, 채팅, 업무 및 리포트를 확인할 수 없습니다
          </li>
          <li className="list-disc pl-1">
            다시 참여하려면 팀원에게 초대 링크 또는 QR코드를 새로 전달 받아야 합니다
          </li>
          <li className="list-disc pl-1">
            기존에 작성한 활동 기록은 프로젝트의 기여도 분석을 위해 보존됩니다
          </li>
        </ul>

        <p className="mt-[18px] text-[13px] leading-5 text-gray-600 underline underline-offset-2">
          프로젝트에서 나간 후 연동된 워크스페이스를 탈퇴해주세요.
        </p>

        {errorMessage && (
          <p className="mt-[18px] text-[13px] leading-5 text-error" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-4 pt-[18px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
            className="h-14 rounded-[14px] bg-gray-100 text-[16px] font-semibold text-gray-400 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLeaving}
            className="h-14 rounded-[14px] bg-error text-[16px] font-semibold text-white disabled:opacity-60"
          >
            {isLeaving ? "나가는 중..." : "나가기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** 400 OWNER_MUST_TRANSFER 응답 전용 안내 — 방장 권한을 넘긴 뒤에야 나갈 수 있다. */
function OwnerTransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      contentClassName="max-w-[362px] rounded-[22px] px-6 pb-[26px] pt-[38px]"
    >
      <div className="flex flex-col">
        <h2 className="text-center text-[18px] font-semibold leading-[26px] text-gray-900">
          방장 권한을 먼저 이전해 주세요
        </h2>

        <ul className="mt-[28px] space-y-[18px] pl-4 text-[13px] leading-[21px] text-gray-400">
          <li className="list-disc pl-1">
            프로젝트 생성자는 다른 팀원에게 방장 권한을 이전해야 프로젝트에서 나갈 수 있습니다
          </li>
          <li className="list-disc pl-1">
            남은 팀원이 없어 혼자만 활동 중이라면 권한 이전 없이 바로 나갈 수 있으며, 이때
            프로젝트도 함께 삭제됩니다
          </li>
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-[30px] h-14 w-full rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white"
        >
          확인
        </button>
      </div>
    </Modal>
  );
}

export function ProjectSettingsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const removeProject = useProjectStore((state) => state.removeProject);
  const mockIntegrationAccounts = useIntegrationStore(
    (state) => state.projectAccounts[id]
  );
  const [settings, setSettings] = useState<ProjectSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isOwnerTransferOpen, setIsOwnerTransferOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const requestIdRef = useRef(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("DEVELOPMENT");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const endYear = Number(year);
    const firstYear = Math.min(currentYear, Number.isFinite(endYear) ? endYear : currentYear);
    return Array.from({ length: 10 }, (_, index) => String(firstYear + index));
  }, [year]);

  const applySettings = useCallback((response: ProjectSettingsResponse) => {
    const [nextYear, nextMonth, nextDay] = splitEndDate(response.endDay);
    setSettings(response);
    setName(response.projectName);
    setType(toUiProjectType(response.projectType));
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
  }, []);

  const loadSettings = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectSettings(id);
      if (requestId === requestIdRef.current) applySettings(response);
    } catch (loadError) {
      if (requestId === requestIdRef.current) setError(getErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [applySettings, id]);

  useEffect(() => {
    if (!id) {
      setError("프로젝트 정보가 올바르지 않아요.");
      setIsLoading(false);
      return;
    }
    void loadSettings();
    return () => {
      requestIdRef.current += 1;
    };
  }, [id, loadSettings]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const isCompleted = settings?.status === "COMPLETED";
  const formDisabled = isLoading || isSaving || isCompleted;
  const trimmedName = name.trim();
  const isFormValid =
    trimmedName.length >= 2 &&
    trimmedName.length <= 20 &&
    isValidDate(year, month, day) &&
    getDaysFromToday(`${year}-${month}-${day}`) >= 0;

  const handleSave = async () => {
    if (!settings || isSaving || isCompleted || !isFormValid) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProjectSettings(id, {
        projectName: trimmedName,
        projectType: toApiProjectType(type),
        endDay: `${year}-${month}-${day}`,
      });
      const refreshedSettings = await getProjectSettings(id);
      applySettings(refreshedSettings);
      await fetchProjects(true);
      navigate(`/project/${id}/feed`);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyInvite = async () => {
    const inviteUrl = settings?.invite.inviteUrl;
    if (!inviteUrl) return;
    try {
      await copyText(createProjectInvitationUrl(inviteUrl));
      setNotice("초대 링크를 복사했어요.");
    } catch {
      setNotice("초대 링크를 복사하지 못했어요.");
    }
  };

  const handleOpenQr = async () => {
    const inviteUrl = settings?.invite.inviteUrl;
    if (!inviteUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(createProjectInvitationUrl(inviteUrl), {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
      setIsQrOpen(true);
    } catch {
      setNotice("QR 코드를 만들지 못했어요.");
    }
  };

  const openLeaveDialog = () => {
    setLeaveError(null);
    setIsLeaveDialogOpen(true);
  };

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      const response = await leaveProject(id);
      if (!response?.success) throw new Error("프로젝트 나가기 응답이 올바르지 않습니다.");
      setIsLeaveDialogOpen(false);
      // 마지막 활성 멤버가 나가면 서버에서 프로젝트까지 삭제되므로, 목록 재조회 전에 로컬에서도 먼저 지운다.
      removeProject(id);
      try {
        await fetchProjects(true);
      } catch {
        // ProjectDataLoader가 /home 진입 후 실패한 강제 조회를 다시 시도한다.
      }
      removeProject(id);
      navigate("/home", { replace: true });
    } catch (requestError) {
      // 방장에게 다른 활성 팀원이 남아 있으면 400 OWNER_MUST_TRANSFER — 권한 이전 안내로 바꿔 띄운다.
      if (isOwnerMustTransferError(requestError)) {
        setIsLeaveDialogOpen(false);
        setIsOwnerTransferOpen(true);
      } else {
        setLeaveError(getErrorMessage(requestError));
      }
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="app-shell flex min-h-svh items-center justify-center bg-gray-25" role="status" aria-label="프로젝트 설정 불러오는 중">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="app-shell min-h-svh bg-gray-25 pb-[116px]">
        <header className="flex h-[52px] items-center border-b border-gray-100 px-5 shadow-sm">
          <button type="button" aria-label="홈으로 가기" onClick={() => navigate("/home")} className="mr-3">
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-[18px] font-semibold text-gray-900">프로젝트 설정</h1>
        </header>
        <main className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
          <p className="text-[15px] text-gray-600">{error}</p>
          <button type="button" onClick={() => void loadSettings()} className="mt-4 rounded-[14px] bg-blue-500 px-5 py-3 text-white">
            다시 시도
          </button>
        </main>

        <footer className="fixed bottom-0 left-1/2 z-20 h-[92px] w-full max-w-mobile -translate-x-1/2 border-t border-gray-100 bg-white px-5 pt-[10px]">
          <button
            type="button"
            onClick={openLeaveDialog}
            disabled={isLeaving}
            className="h-14 w-full rounded-[14px] border border-error text-[16px] font-semibold text-error disabled:opacity-50"
          >
            프로젝트 나가기
          </button>
        </footer>

        <ProjectLeaveDialog
          open={isLeaveDialogOpen}
          isLeaving={isLeaving}
          errorMessage={leaveError}
          onConfirm={() => void handleLeave()}
          onCancel={() => {
            if (!isLeaving) setIsLeaveDialogOpen(false);
          }}
        />

        <OwnerTransferDialog
          open={isOwnerTransferOpen}
          onClose={() => setIsOwnerTransferOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-svh bg-gray-25 pb-[116px]">
      <header className="flex h-[52px] items-center border-b border-gray-100 bg-gray-25 px-5 shadow-sm">
        <button type="button" aria-label="뒤로 가기" onClick={() => navigate(`/project/${id}/feed`)} className="mr-3 flex h-6 w-6 items-center justify-center">
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-[18px] font-semibold text-gray-900">프로젝트 설정</h1>
      </header>

      <main className="px-5 pt-[18px]">
        {isCompleted && (
          <p className="mb-4 rounded-[12px] bg-gray-100 px-4 py-3 text-[13px] text-gray-600">
            완료된 프로젝트의 설정은 변경할 수 없어요.
          </p>
        )}
        {error && <p className="mb-4 text-[13px] text-error" role="alert">{error}</p>}
        <label className="block text-[14px] font-normal text-gray-700">
          프로젝트명
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={formDisabled}
            maxLength={20}
            className="mt-[11px] h-14 w-full rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </label>

        <label className="mt-[22px] block text-[14px] font-normal text-gray-700">
          프로젝트 유형
          <div className="relative mt-[11px]">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ProjectType)}
              disabled={formDisabled}
              className="h-14 w-full appearance-none rounded-[14px] border border-gray-200 bg-transparent px-[18px] text-[15px] text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="DEVELOPMENT">개발 프로젝트</option>
              <option value="GENERAL">일반 팀프로젝트</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          </div>
        </label>

        <fieldset className="mt-[22px]">
          <legend className="text-[14px] font-normal text-gray-700">예상 종료일</legend>
          <div className="mt-[11px] flex gap-[7px]">
            <DateDropdownSelect value={year} onChange={setYear} options={years} ariaLabel="종료 연도" disabled={formDisabled} rounded="xl" />
            <DateDropdownSelect value={month} onChange={setMonth} options={MONTHS} ariaLabel="종료 월" disabled={formDisabled} rounded="xl" />
            <DateDropdownSelect value={day} onChange={setDay} options={DAYS} ariaLabel="종료 일" disabled={formDisabled} rounded="xl" />
          </div>
          {isValidDate(year, month, day) && getDaysFromToday(`${year}-${month}-${day}`) < 0 && (
            <p className="mt-1.5 text-caption font-normal text-error">오늘 또는 이후 날짜를 선택해 주세요</p>
          )}
        </fieldset>

        <section className="mt-[22px]">
          <h2 className="text-[14px] font-normal text-gray-700">팀원 초대</h2>
          <div className="mt-[11px] grid grid-cols-2 gap-4">
            <button type="button" onClick={() => void handleCopyInvite()} className="flex h-14 items-center justify-center gap-2 rounded-[14px] bg-blue-100 text-[16px] font-semibold text-navy-700">
              <Link2 className="h-[18px] w-[18px]" /> 링크 초대
            </button>
            <button type="button" onClick={() => void handleOpenQr()} className="flex h-14 items-center justify-center gap-2 rounded-[14px] bg-blue-100 text-[16px] font-semibold text-navy-700">
              <QrCode className="h-[18px] w-[18px]" /> QR 초대
            </button>
          </div>
        </section>

        <section className="mt-[17px]">
          <h2 className="text-[14px] font-normal text-gray-900">
            팀 워크스페이스 연동 <span className="text-error">*</span>
          </h2>
          <p className="mt-1 text-[12px] font-normal text-gray-400">워크스페이스를 소유한 팀원만 연동할 수 있어요.</p>
          <div className="mt-2 rounded-[16px] border border-gray-100 bg-white/10 px-[18px] shadow-card">
            {INTEGRATIONS.map((integration) => {
              const serverConnected = settings.externalConnections.some(
                (connection) => connection.linkType === integration.type && connection.isLinked
              );
              const storeProvider: IntegrationProvider =
                integration.id === "docs"
                  ? "googleDocs"
                  : integration.id === "slides"
                    ? "googleSlides"
                    : integration.id;
              const mockConnected = mockIntegrationAccounts?.[storeProvider] ?? false;
              const connected = serverConnected || mockConnected;
              return (
                <button
                  key={integration.id}
                  type="button"
                  onClick={() =>
                    navigate(`/project/${id}/settings/integrations/${integration.id}`, {
                      state: {
                        isConnected: connected,
                        isMockConnected: mockConnected && !serverConnected,
                      },
                    })
                  }
                  className="flex h-[61px] w-full items-center"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white">
                    <img src={integration.icon} alt="" className="object-contain" style={{ width: integration.logo, height: integration.logo }} />
                  </span>
                  <span className="ml-3 flex-1 text-left text-[15px] font-normal text-gray-900">{integration.label}</span>
                  <span className={`mr-[14px] rounded-full px-[14px] py-[5px] text-[12px] ${connected ? "bg-[#E9F8F0] text-success" : "bg-[#FDEDEE] text-error"}`}>
                    {connected ? "연동" : "미연동"}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-1/2 z-20 grid h-[92px] w-full max-w-mobile -translate-x-1/2 grid-cols-[1fr_1fr] gap-4 border-t border-gray-100 bg-white px-5 pt-[10px]">
        <button type="button" onClick={openLeaveDialog} disabled={isLeaving} className="h-14 rounded-[14px] border border-error text-[16px] font-semibold text-error disabled:opacity-50">
          프로젝트 나가기
        </button>
        <button type="button" onClick={() => void handleSave()} disabled={!isFormValid || formDisabled} className="h-14 rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400">
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </footer>

      {notice && (
        <div
          className={`fixed bottom-[104px] left-1/2 z-40 w-[calc(100%-40px)] max-w-[362px] -translate-x-1/2 rounded-[12px] px-4 py-3 text-center text-[13px] text-white shadow-lg ${
            notice.includes("못했") ? "bg-error" : "bg-gray-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      )}

      <ProjectLeaveDialog
        open={isLeaveDialogOpen}
        isLeaving={isLeaving}
        errorMessage={leaveError}
        onConfirm={() => void handleLeave()}
        onCancel={() => {
          if (!isLeaving) setIsLeaveDialogOpen(false);
        }}
      />

      <OwnerTransferDialog
        open={isOwnerTransferOpen}
        onClose={() => setIsOwnerTransferOpen(false)}
      />

      <Modal open={isQrOpen} onClose={() => setIsQrOpen(false)}>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[18px] font-semibold text-gray-900">프로젝트 초대 QR</h2>
          {qrDataUrl && <img src={qrDataUrl} alt="프로젝트 초대 링크 QR 코드" className="mt-4 h-60 w-60" />}
          <button type="button" onClick={() => setIsQrOpen(false)} className="mt-4 h-12 w-full rounded-[14px] bg-blue-500 font-semibold text-white">확인</button>
        </div>
      </Modal>
    </div>
  );
}
