import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Folder,
  Link2,
  MessageSquare,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import figmaIcon from "../../assets/integrations/figma.svg";
import githubIcon from "../../assets/integrations/github.svg";
import notionIcon from "../../assets/integrations/notion.png";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { BottomSheet, Modal } from "../../components/Modal";
import { isFutureDate } from "../../lib/projectDate";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import { useProjectStore } from "../../store/projectStore";
import type { Project, ProjectType } from "../../types/project";
import HomePage from "../HomePage";

type CreationStep = "info" | "tools";
type ToolKey = "github" | "figma" | "notion";

const TOOL_OPTIONS: Array<{
  key: ToolKey;
  name: string;
  description: string;
}> = [
  { key: "github", name: "GitHub", description: "커밋/PR 자동 수집" },
  { key: "figma", name: "Figma", description: "파일 업로드 추적" },
  { key: "notion", name: "Notion", description: "문서 작성 기록" },
];

function createProjectId() {
  const uniqueId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `project-${uniqueId}`;
}

function ProjectCreationProgress({ step }: { step: CreationStep }) {
  const isInfoStep = step === "info";

  return (
    <div>
      <h1 className="text-h3 font-bold text-gray-900">프로젝트 생성</h1>
      <p className="mt-1.5 text-caption font-normal text-gray-400">
        {isInfoStep ? "1단계 · 프로젝트 정보 (필수)" : "2단계 · 툴 연동 (선택)"}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-aqua-500 transition-all"
          style={{ width: isInfoStep ? "51%" : "100%" }}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  ariaLabel,
  value,
  onChange,
  children,
}: {
  label?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 flex-1">
      {label && <span className="mb-2 block text-body-sm font-medium text-gray-700">{label}</span>}
      <span className="relative block">
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-14 w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 pr-10 text-body outline-none",
            value ? "text-gray-900" : "text-gray-400",
            "focus:border-blue-500"
          )}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </span>
    </label>
  );
}

function ProjectCreationBackdrop() {
  const bottomTabs = [
    { label: "프로젝트", icon: Folder },
    { label: "리포트", icon: FileText },
    { label: "채팅", icon: MessageSquare },
    { label: "마이", icon: UserRound },
  ];

  return (
    <div className="min-h-svh bg-gray-25" aria-hidden="true">
      <HomePage viewModeOverride="list" />
      <div className="fixed bottom-0 left-1/2 grid h-20 w-full max-w-mobile -translate-x-1/2 grid-cols-4 border-t border-gray-200 bg-white">
        {bottomTabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <span
              key={tab.label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-caption font-normal",
                index === 0 ? "text-blue-500" : "text-gray-400"
              )}
            >
              <Icon size={22} aria-hidden="true" />
              {tab.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ToolLogo({ tool }: { tool: (typeof TOOL_OPTIONS)[number] }) {
  if (tool.key === "github") {
    return (
      <img src={githubIcon} alt="" className="h-11 w-11 shrink-0" aria-hidden="true" />
    );
  }

  if (tool.key === "figma") {
    return (
      <img src={figmaIcon} alt="" className="h-11 w-11 shrink-0" aria-hidden="true" />
    );
  }

  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white">
      <img src={notionIcon} alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
    </span>
  );
}

function QrPlaceholder() {
  return (
    <svg viewBox="0 0 21 21" role="img" aria-label="QR 코드 자리표시자" className="h-52 w-52">
      <rect width="21" height="21" fill="white" />
      <path
        fill="black"
        d="M1 1h7v7H1V1Zm2 2v3h3V3H3Zm10-2h7v7h-7V1Zm2 2v3h3V3h-3ZM1 13h7v7H1v-7Zm2 2v3h3v-3H3Zm7-14h2v2h-2V1Zm0 3h3v2h-1v2h-2V4Zm-1 5h2v2h2V9h2v2h2V9h3v3h-2v2h2v2h-3v-2h-2v2h2v4h-2v-2h-3v2H9v-3h2v-2H9v-2h2v-2H9V9Zm4-2h2v2h-2V7Zm4 0h3v2h-3V7ZM8 11h2v2H8v-2Zm-7-1h3v2H1v-2Zm4 0h2v3H5v-3Zm-4 4h2v-2H1v2Zm7 0h2v2H8v-2Zm10 3h2v3h-2v-3Z"
      />
    </svg>
  );
}

function CreatedProjectBackdrop({ projectName }: { projectName: string }) {
  const tabs = ["피드", "채팅", "업무", "리포트"];
  const bottomTabs = [
    { label: "프로젝트", icon: Folder },
    { label: "리포트", icon: FileText },
    { label: "채팅", icon: MessageSquare },
    { label: "마이", icon: UserRound },
  ];

  return (
    <div className="min-h-svh bg-gray-25" aria-hidden="true">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
        <div className="flex items-center gap-4">
          <ArrowLeft size={22} />
          <strong className="text-title text-gray-900">{projectName}</strong>
        </div>
        <Settings size={22} className="text-gray-500" />
      </header>
      <div className="grid h-12 grid-cols-4 border-b border-gray-100">
        {tabs.map((tab, index) => (
          <span
            key={tab}
            className={cn(
              "flex items-center justify-center text-body-sm",
              index === 0 ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-400"
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="fixed bottom-0 left-1/2 grid h-20 w-full max-w-mobile -translate-x-1/2 grid-cols-4 border-t border-gray-200 bg-white">
        {bottomTabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <span
              key={tab.label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-caption font-normal",
                index === 0 ? "text-blue-500" : "text-gray-400"
              )}
            >
              <Icon size={22} />
              {tab.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function CreateProjectPage() {
  const navigate = useNavigate();
  const addProject = useProjectStore((state) => state.addProject);
  const user = useAuthStore((state) => state.user);
  const today = useMemo(() => new Date(), []);
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, index) => today.getFullYear() + index),
    [today]
  );

  const [step, setStep] = useState<CreationStep>("info");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [connectedTools, setConnectedTools] = useState<Record<ToolKey, boolean>>({
    github: true,
    figma: false,
    notion: true,
  });
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [copied, setCopied] = useState(false);
  const creationStartedRef = useRef(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    },
    []
  );

  const normalizedName = projectName.trim();
  const nameValid = normalizedName.length >= 2 && normalizedName.length <= 20;
  const daysInSelectedMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [month, year]);
  const expectedEndDate =
    year && month && day
      ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";
  const dateValid = isFutureDate(expectedEndDate);
  const infoValid = nameValid && projectType !== "" && dateValid;

  const nameError =
    nameTouched && !nameValid
      ? normalizedName.length === 0
        ? "프로젝트명을 입력해 주세요"
        : "프로젝트명은 앞뒤 공백 제외 2~20자로 입력해 주세요"
      : undefined;

  const handleMonthChange = (nextMonth: string) => {
    setMonth(nextMonth);
    if (year && day) {
      const nextMonthDays = new Date(Number(year), Number(nextMonth), 0).getDate();
      if (Number(day) > nextMonthDays) setDay("");
    }
  };

  const handleInfoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNameTouched(true);
    if (infoValid) setStep("tools");
  };

  const handleCreate = () => {
    if (!infoValid || !projectType || creationStartedRef.current) return;
    creationStartedRef.current = true;

    const id = createProjectId();
    const project: Project = {
      id,
      name: normalizedName,
      type: projectType,
      status: "IN_PROGRESS",
      progress: 0,
      expectedEndDate,
      members: user
        ? [
            {
              id: user.id,
              nickname: user.nickname || user.realName,
              profileImageUrl: user.avatarImageUrl ?? undefined,
            },
          ]
        : [],
      invitationLink: `${window.location.origin}/invite/${id}`,
    };

    addProject(project);
    setCreatedProject(project);
  };

  const handleEnterProject = () => {
    if (createdProject) navigate(`/project/${createdProject.id}/feed`);
  };

  const handleCopyLink = async () => {
    if (!createdProject) return;
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);

    try {
      await navigator.clipboard.writeText(createdProject.invitationLink);
      setCopied(true);
      copyResetTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyResetTimerRef.current = null;
      }, 1800);
    } catch {
      setCopied(false);
      copyResetTimerRef.current = null;
    }
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-gray-25">
      {createdProject ? (
        <CreatedProjectBackdrop projectName={createdProject.name} />
      ) : (
        <div className="pointer-events-none select-none" aria-hidden="true" inert>
          <ProjectCreationBackdrop />
        </div>
      )}

      <BottomSheet open={!createdProject} onClose={() => navigate("/home")}>
        {step === "info" ? (
          <form className="flex min-h-[512px] flex-col pb-4" onSubmit={handleInfoSubmit} noValidate>
            <ProjectCreationProgress step={step} />

            <div className="mt-6 space-y-4">
              <Input
                label="프로젝트명"
                placeholder="예: 앱 리디자인 프로젝트"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                onBlur={() => setNameTouched(true)}
                errorText={nameError}
                className="h-14 rounded-lg"
                autoFocus
              />

              <SelectField value={projectType} onChange={(value) => setProjectType(value as ProjectType)} label="프로젝트 유형">
                <option value="" disabled>유형을 선택하세요</option>
                <option value="DEVELOPMENT">개발 프로젝트</option>
                <option value="GENERAL">일반 팀프로젝트</option>
              </SelectField>

              <fieldset>
                <legend className="mb-2 text-body-sm font-medium text-gray-700">예상 종료일</legend>
                <div className="flex gap-2">
                  <SelectField ariaLabel="예상 종료 연도" value={year} onChange={setYear}>
                    <option value="" disabled>YYYY</option>
                    {years.map((item) => <option key={item} value={item}>{item}</option>)}
                  </SelectField>
                  <SelectField ariaLabel="예상 종료 월" value={month} onChange={handleMonthChange}>
                    <option value="" disabled>MM</option>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                      <option key={item} value={item}>{String(item).padStart(2, "0")}</option>
                    ))}
                  </SelectField>
                  <SelectField ariaLabel="예상 종료 일" value={day} onChange={setDay}>
                    <option value="" disabled>DD</option>
                    {Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1).map((item) => (
                      <option key={item} value={item}>{String(item).padStart(2, "0")}</option>
                    ))}
                  </SelectField>
                </div>
                {expectedEndDate && !dateValid && (
                  <p className="mt-1.5 text-caption font-normal text-error">오늘보다 이후 날짜를 선택해 주세요</p>
                )}
              </fieldset>
            </div>

            <div className="mt-auto pt-6">
              <Button type="submit" size="lg" className="!text-white">다음</Button>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="mt-4 w-full text-center text-body font-semibold text-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="flex min-h-[512px] flex-col pb-4">
            <ProjectCreationProgress step={step} />
            <p className="mt-6 text-body-sm text-gray-400">
              워크스페이스의 소유자의 연동이 필요합니다
            </p>

            <div className="mt-4 space-y-3">
              {TOOL_OPTIONS.map((tool) => {
                const connected = connectedTools[tool.key];
                return (
                  <button
                    key={tool.key}
                    type="button"
                    aria-pressed={connected}
                    onClick={() => setConnectedTools((current) => ({ ...current, [tool.key]: !connected }))}
                    className="flex h-[76px] w-full items-center gap-4 rounded-lg bg-gray-50 px-4 text-left"
                  >
                    <ToolLogo tool={tool} />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-title font-bold text-gray-900">{tool.name}</strong>
                      <span className="mt-0.5 block text-caption font-normal text-gray-400">{tool.description}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-caption",
                        connected ? "bg-success/10 text-success" : "bg-error/10 text-error"
                      )}
                    >
                      {connected ? "연동" : "미연동"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-6">
              <Button type="button" size="lg" onClick={handleCreate} className="!text-white">
                프로젝트 시작하기
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <Modal open={createdProject !== null} onClose={handleEnterProject}>
        {createdProject && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-title font-bold text-gray-900">팀원 초대</h2>
                <p className="mt-1.5 text-body-sm text-gray-400">QR 또는 링크로 팀원을 초대하세요</p>
              </div>
              <button
                type="button"
                aria-label="초대 창 닫기"
                onClick={handleEnterProject}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex h-72 items-center justify-center rounded-lg bg-gray-25 p-5">
              <QrPlaceholder />
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-blue-500 text-body font-semibold text-blue-500"
            >
              <Link2 size={17} aria-hidden="true" />
              <span aria-live="polite">{copied ? "복사 완료" : "초대 링크 복사"}</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
