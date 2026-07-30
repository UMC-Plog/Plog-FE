import { useEffect, useRef, useState } from "react";
import { CalendarDays, Folder, UsersRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  getProjectInvitationPreview,
  joinProject,
} from "../../api/projectApi";
import { Button } from "../../components/Button";
import { AlertModal } from "../../components/Modal";
import { rememberProjectInvitationPath } from "../../lib/projectInvitation";
import { useAuthStore } from "../../store/authStore";
import { useProjectStore } from "../../store/projectStore";
import type { ProjectInvitationPreviewResponse } from "../../types/project";
import { PlogMark } from "../MyPage";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function formatEndDay(value: string) {
  return value.replaceAll("-", ".");
}

export function ProjectInvitationPage() {
  const { inviteCode = "" } = useParams();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const [invitation, setInvitation] =
    useState<ProjectInvitationPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinStartedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    if (!inviteCode) {
      setError("유효하지 않은 초대 링크예요.");
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      rememberProjectInvitationPath(inviteCode);
      navigate("/login", { replace: true });
      return;
    }

    void getProjectInvitationPreview(inviteCode)
      .then((response) => {
        if (isActive) setInvitation(response);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;
        setError(
          getErrorMessage(
            requestError,
            "초대 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          )
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, inviteCode, navigate]);

  const handleAccept = async () => {
    if (!inviteCode || joinStartedRef.current) return;
    joinStartedRef.current = true;
    setIsJoining(true);

    try {
      const joinedProject = await joinProject(inviteCode);
      try {
        await fetchProjects(true);
      } catch {
        // 참여는 성공했으므로 프로젝트 화면에서 목록을 다시 조회할 수 있다.
      }
      navigate(`/project/${joinedProject.projectId}/feed`, { replace: true });
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "프로젝트 초대를 수락하지 못했어요. 잠시 후 다시 시도해 주세요."
        )
      );
      joinStartedRef.current = false;
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="app-shell flex min-h-svh items-center justify-center bg-gray-25"
        role="status"
        aria-label="프로젝트 초대 정보 불러오는 중"
      >
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="app-shell min-h-svh bg-gray-25">
        <AlertModal
          open={Boolean(error)}
          title="초대 정보를 확인하지 못했어요"
          description={error ?? undefined}
          confirmText="홈으로 이동"
          onConfirm={() => navigate("/home", { replace: true })}
        />
      </div>
    );
  }

  const details = [
    { label: "프로젝트명", value: invitation.projectName, icon: Folder },
    {
      label: "프로젝트 유형",
      value: invitation.projectType === "DEVELOP" ? "개발" : "일반",
      icon: UsersRound,
    },
    {
      label: "프로젝트 예상 종료일",
      value: formatEndDay(invitation.endDay),
      icon: CalendarDays,
    },
  ];

  return (
    <main className="app-shell min-h-svh bg-gray-25 px-5 pb-7 pt-[88px] text-center">
      <div className="flex h-[110px] items-center justify-center overflow-visible">
        <span className="scale-[4]">
          <PlogMark />
        </span>
      </div>

      <div className="mt-6">
        <span className="inline-flex h-7 items-center rounded-full bg-blue-50 px-4 text-[12px] font-semibold text-blue-500">
          프로젝트 초대
        </span>
        <h1 className="mt-3 text-[24px] font-bold leading-[34px] tracking-[-0.5px] text-gray-900">
          프로젝트 초대를 수락할까요?
        </h1>
        <p className="mt-1.5 text-[13px] leading-5 text-gray-400">
          초대를 수락하면 프로젝트에 바로 참여할 수 있어요
        </p>
      </div>

      <section className="mt-9 rounded-16 border border-gray-100 bg-white/60 px-[26px] py-3 text-left shadow-card">
        {details.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex min-h-[70px] items-center gap-4 ${
              index < details.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 grid-cols-[132px_minmax(0,1fr)] items-center gap-1">
              <span className="text-[13px] text-gray-400">{label}</span>
              <strong className="truncate text-[14px] font-semibold text-gray-900">
                {value}
              </strong>
            </span>
          </div>
        ))}
      </section>

      <div className="mt-auto pt-8">
        <Button
          type="button"
          size="lg"
          loading={isJoining}
          onClick={() => void handleAccept()}
        >
          수락
        </Button>
        <button
          type="button"
          disabled={isJoining}
          onClick={() => navigate("/home", { replace: true })}
          className="mt-5 text-[15px] font-semibold text-gray-400 disabled:opacity-50"
        >
          거절
        </button>
      </div>

      <AlertModal
        open={Boolean(error)}
        title="프로젝트 초대를 수락하지 못했어요"
        description={error ?? undefined}
        onConfirm={() => setError(null)}
      />
    </main>
  );
}
