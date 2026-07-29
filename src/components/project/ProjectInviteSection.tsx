import { useEffect, useRef, useState } from "react";
import { Check, Copy, QrCode, TriangleAlert } from "lucide-react";
import { Button } from "../Button";

interface ProjectInviteSectionProps {
  invitationLink: string;
}

type CopyStatus = "idle" | "copied" | "error";

export function ProjectInviteSection({ invitationLink }: ProjectInviteSectionProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const scheduleStatusReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setCopyStatus("idle");
      resetTimerRef.current = null;
    }, 1800);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    scheduleStatusReset();
  };

  return (
    <section aria-labelledby="project-invite-title">
      <div>
        <h2 id="project-invite-title" className="text-title font-bold text-gray-900">팀원 초대</h2>
        <p className="mt-1 text-body-sm text-gray-400">링크를 공유해 프로젝트에 팀원을 초대하세요</p>
      </div>
      <div className="mt-4 flex flex-col items-center rounded-lg border border-gray-100 bg-gray-25 p-5">
        <div className="flex h-40 w-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-center" role="img" aria-label="초대 QR 목업 미리보기">
          <QrCode size={64} strokeWidth={1.5} className="text-navy-700" aria-hidden="true" />
          <strong className="mt-2 text-body-sm font-semibold text-gray-700">초대 QR</strong>
          <span className="mt-1 text-caption font-normal text-gray-400">목업 미리보기</span>
        </div>
        <p className="mt-3 text-center text-caption font-normal text-gray-400">현재 QR은 디자인 확인용이며 스캔 기능을 지원하지 않아요</p>
      </div>
      <div className="mt-4">
        <label htmlFor="project-invitation-link" className="mb-1.5 block text-body-sm font-medium text-gray-700">초대 링크</label>
        <div className="flex items-center gap-2">
          <input id="project-invitation-link" value={invitationLink} readOnly className="h-12 min-w-0 flex-1 truncate rounded-md border border-gray-200 bg-gray-50 px-3.5 text-body-sm text-gray-500 outline-none" />
          <Button
            type="button"
            size="md"
            fullWidth={false}
            variant={copyStatus === "copied" ? "outline" : "primary"}
            onClick={handleCopy}
            icon={copyStatus === "copied" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
            className={copyStatus === "copied" ? "shrink-0 px-4 !text-blue-500" : "shrink-0 px-4 !text-white"}
          >
            {copyStatus === "copied" ? "복사 완료" : "복사"}
          </Button>
        </div>
        <div className="mt-1.5 min-h-5" aria-live="polite">
          {copyStatus === "copied" && <p className="flex items-center gap-1 text-caption font-normal text-success"><Check size={14} aria-hidden="true" /> 초대 링크를 복사했어요</p>}
          {copyStatus === "error" && <p className="flex items-center gap-1 text-caption font-normal text-error"><TriangleAlert size={14} aria-hidden="true" /> 링크를 복사하지 못했어요</p>}
        </div>
      </div>
    </section>
  );
}
