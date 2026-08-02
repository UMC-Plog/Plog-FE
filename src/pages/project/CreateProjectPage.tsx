import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  FileText,
  Folder,
  Info,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Button } from "../../components/Button";
import { DateDropdownSelect } from "../../components/DateDropdownSelect";
import { Input } from "../../components/Input";
import { AlertModal, BottomSheet, Modal } from "../../components/Modal";
import { getDaysFromToday } from "../../lib/projectDate";
import { createProjectInvitationUrl } from "../../lib/projectInvitation";
import { cn } from "../../lib/utils";
import inviteLinkIcon from "../../assets/invite-link-icon.svg";
import { toApiProjectType } from "../../api/projectApi";
import { ApiError } from "../../api/client";
import { useProjectStore } from "../../store/projectStore";
import type { CreatedProject, ProjectType } from "../../types/project";

type CreationStep = "info" | "tools";

function ProjectCreationProgress({ step }: { step: CreationStep }) {
  const isInfoStep = step === "info";

  return (
    <div>
      <h1 className="text-h3 font-bold text-gray-900">프로젝트 생성</h1>
      <p className="mt-1.5 text-caption font-normal text-gray-400">
        {isInfoStep ? "1단계 · 프로젝트 정보 (필수)" : "2단계 · 계정연동 안내"}
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
  return (
    <div className="min-h-svh bg-gray-25" aria-hidden="true">
      <header className="flex h-16 items-center gap-3 border-b border-gray-100 px-6 shadow-sm">
        <Folder size={24} className="text-blue-500" />
        <strong className="text-title font-bold text-gray-900">프로젝트</strong>
      </header>
      <div className="px-5 pt-5">
        <div className="h-8 w-44 rounded-full bg-gray-100" />
        <div className="mt-4 h-44 rounded-lg border border-gray-100 bg-white shadow-md" />
      </div>
    </div>
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
      <header className="flex h-16 items-center border-b border-gray-100 px-5">
        <div className="flex items-center gap-4">
          <ArrowLeft size={22} />
          <strong className="text-title text-gray-900">{projectName}</strong>
        </div>
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
  const createProject = useProjectStore((state) => state.createProject);
  const today = useMemo(() => new Date(), []);
  const years = useMemo(
    () => Array.from({ length: 10 }, (_, index) => today.getFullYear() + index),
    [today]
  );

  const [step, setStep] = useState<CreationStep>("info");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [day, setDay] = useState(String(today.getDate()));
  const [nameTouched, setNameTouched] = useState(false);
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const creationStartedRef = useRef(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invitationUrl = createdProject
    ? createProjectInvitationUrl(
        createdProject.invitationLink,
        createdProject.invitationCode
      )
    : "";

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!createdProject) {
      setQrDataUrl(null);
      setQrError(false);
      return;
    }

    let isActive = true;
    setQrDataUrl(null);
    setQrError(false);

    void QRCode.toDataURL(invitationUrl, {
      width: 208,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (isActive) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (isActive) setQrError(true);
      });

    return () => {
      isActive = false;
    };
  }, [createdProject, invitationUrl]);

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
  const dateValid = Boolean(expectedEndDate) && getDaysFromToday(expectedEndDate) >= 0;
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

  const handleCreate = async () => {
    if (!infoValid || !projectType || creationStartedRef.current) return;
    creationStartedRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const project = await createProject({
        projectName: normalizedName,
        projectType: toApiProjectType(projectType),
        endDay: expectedEndDate,
      });
      setCreatedProject(project);
    } catch (error: unknown) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "네트워크 상태를 확인한 뒤 다시 시도해 주세요."
      );
      creationStartedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterProject = () => {
    if (createdProject) navigate(`/project/${createdProject.id}/feed`);
  };

  const handleCopyLink = async () => {
    if (!createdProject) return;
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);

    try {
      await navigator.clipboard.writeText(invitationUrl);
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
        <div className="pointer-events-none select-none" aria-hidden="true">
          <ProjectCreationBackdrop />
        </div>
      )}

      <BottomSheet
        open={!createdProject}
        onClose={() => navigate("/home")}
        contentClassName={step === "tools" ? "px-5 pb-[38px]" : undefined}
      >
        {step === "info" ? (
          <form className="flex min-h-[506px] flex-col pb-4" onSubmit={handleInfoSubmit} noValidate>
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
                  <DateDropdownSelect ariaLabel="예상 종료 연도" value={year} onChange={setYear} options={years.map(String)} />
                  <DateDropdownSelect
                    ariaLabel="예상 종료 월"
                    value={month.padStart(2, "0")}
                    onChange={handleMonthChange}
                    options={Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"))}
                  />
                  <DateDropdownSelect
                    ariaLabel="예상 종료 일"
                    value={day.padStart(2, "0")}
                    onChange={setDay}
                    options={Array.from({ length: daysInSelectedMonth }, (_, index) => String(index + 1).padStart(2, "0"))}
                  />
                </div>
                {expectedEndDate && !dateValid && (
                  <p className="mt-1.5 text-caption font-normal text-error">오늘 또는 이후 날짜를 선택해 주세요</p>
                )}
              </fieldset>
            </div>

            <div className="mt-auto pt-6">
              <Button type="submit" size="lg" disabled={!infoValid}>다음</Button>
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
          <div className="flex min-h-[506px] flex-col">
            <ProjectCreationProgress step={step} />

            <div className="mt-[21px] flex min-h-[71px] items-start gap-2 rounded-[12px] bg-blue-50 px-[18px] py-[11px] text-[12px] leading-[17px] text-blue-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>
                <strong className="font-semibold">프로젝트 분석을 위해 계정 연동이 필요해요</strong>
                <br />
                계정을 연동 시 팀원들의 활동 데이터를 자동으로 수집해 AI 분석
                <br />
                기능을 사용할 수 있어요
              </p>
            </div>

            <ul className="mt-[28px] space-y-[16px] px-[18px] text-[12px] leading-[17px] text-gray-700">
              <li className="flex min-h-8 items-start gap-4">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.5} aria-hidden />
                <span>GitHub, Notion, Google Docs, Slides, Figma 등 외부도구<br />활동을 연동해주세요</span>
              </li>
              <li className="flex min-h-8 items-start gap-4">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.5} aria-hidden />
                <span>연동계정 등록은 워크스페이스 소유자(생성자)만이 진행할 수<br />있어요</span>
              </li>
              <li className="flex min-h-8 items-start gap-4">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.5} aria-hidden />
                <span>프로젝트 생성 후 [프로젝트 설정] &gt; [계정 연동]에서 추가 또는<br />변경할 수 있어요</span>
              </li>
              <li className="flex min-h-8 items-start gap-4">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.5} aria-hidden />
                <span>연동한 데이터는 프로젝트 멤버 모두가 확인할 수 있어요</span>
              </li>
            </ul>

            <div className="mt-auto pt-5">
              <Button type="button" size="lg" onClick={handleCreate} loading={isSubmitting} className="rounded-[14px]">
                다음
              </Button>
              <button
                type="button"
                onClick={() => navigate("/home")}
                disabled={isSubmitting}
                className="mt-[21px] w-full text-center text-[16px] font-semibold text-gray-400 disabled:opacity-50"
              >
                취소
              </button>
            </div>

            <p className="hidden">
              외부 툴을 연동하면 활동 데이터를 자동으로 수집할 수 있어요
            </p>

            <div className="hidden">
              {([] as Array<{ key: string; name: string; description: string }>).map((tool) => {
                const connected = false;
                return (
                  <button
                    key={tool.key}
                    type="button"
                    aria-pressed={connected}
                    onClick={() => undefined}
                    className="flex h-20 w-full items-center gap-4 rounded-lg bg-gray-50 px-4 text-left"
                  >
                    <span />
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

            <div className="hidden">
              <Button type="button" size="lg" onClick={handleCreate} loading={isSubmitting}>
                프로젝트 시작하기
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <Modal
        open={createdProject !== null}
        onClose={handleEnterProject}
        contentClassName="rounded-[24px] p-[22px]"
      >
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

            <div className="mt-4 flex min-h-64 items-center justify-center rounded-lg bg-gray-25 p-5">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`${createdProject.name} 프로젝트 초대 QR 코드`}
                  className="h-52 w-52"
                />
              ) : qrError ? (
                <p className="text-body-sm text-gray-500">
                  QR 코드를 불러오지 못했어요.
                </p>
              ) : (
                <span
                  className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500"
                  role="status"
                  aria-label="QR 코드 생성 중"
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-blue-500 text-body font-semibold text-blue-500"
            >
              <img src={inviteLinkIcon} alt="" className="h-4 w-4" aria-hidden="true" />
              <span aria-live="polite">{copied ? "복사 완료" : "초대 링크 복사"}</span>
            </button>
          </div>
        )}
      </Modal>

      <AlertModal
        open={Boolean(submitError)}
        title="프로젝트를 생성하지 못했어요"
        description={submitError ?? undefined}
        onConfirm={() => setSubmitError(null)}
      />
    </div>
  );
}
