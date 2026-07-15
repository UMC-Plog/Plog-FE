import { useState } from "react";
import { useNavigate } from "react-router-dom";
import figmaIcon from "../../assets/integrations/figma.svg";
import githubIcon from "../../assets/integrations/github.svg";
import githubUnlinkIcon from "../../assets/integrations/github-unlink.svg";
import googleDocsIcon from "../../assets/integrations/google-docs.svg";
import googleSlidesIcon from "../../assets/integrations/google-slides.svg";
import notionIcon from "../../assets/integrations/notion.png";
import { AuthHeader } from "../../components/AuthHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AccountConnectionItem } from "../../components/my/AccountConnectionItem";
import {
  useIntegrationStore,
  type IntegrationProvider,
} from "../../store/integrationStore";

interface IntegrationService {
  provider: IntegrationProvider;
  name: string;
  icon: string;
}

const SERVICES: IntegrationService[] = [
  { provider: "github", name: "GitHub", icon: githubIcon },
  { provider: "figma", name: "Figma", icon: figmaIcon },
  { provider: "notion", name: "Notion", icon: notionIcon },
  { provider: "googleDocs", name: "Google docs", icon: googleDocsIcon },
  { provider: "googleSlides", name: "Google slides", icon: googleSlidesIcon },
];

export function AccountConnectionsPage() {
  const navigate = useNavigate();
  const accounts = useIntegrationStore((state) => state.accounts);
  const connect = useIntegrationStore((state) => state.connect);
  const disconnect = useIntegrationStore((state) => state.disconnect);
  const [pendingDisconnect, setPendingDisconnect] = useState<IntegrationProvider | null>(null);
  const [feedback, setFeedback] = useState("");

  const pendingService = SERVICES.find((service) => service.provider === pendingDisconnect);

  const handleConnect = (service: IntegrationService) => {
    connect(service.provider);
    setFeedback(`${service.name} 계정이 연동됐어요.`);
  };

  const handleDisconnect = () => {
    if (!pendingService) return;
    disconnect(pendingService.provider);
    setFeedback(`${pendingService.name} 계정 연동을 해제했어요.`);
    setPendingDisconnect(null);
  };

  return (
    <div className="min-h-svh bg-gray-25">
      <AuthHeader
        title="계정 연동"
        variant="inline"
        onBack={() => navigate("/my")}
      />

      <main className="px-4 pt-6">
        <p className="px-2 text-caption font-normal text-gray-400">
          연동된 툴의 활동 데이터가 기여도 분석에 자동 반영됩니다
        </p>
        <ul className="mt-3 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md">
          {SERVICES.map((service) => (
            <AccountConnectionItem
              key={service.provider}
              provider={service.provider}
              name={service.name}
              icon={service.icon}
              connected={accounts[service.provider]}
              onConnect={() => handleConnect(service)}
              onDisconnect={() => setPendingDisconnect(service.provider)}
            />
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {feedback}
        </p>
      </main>

      <ConfirmDialog
        open={pendingDisconnect !== null}
        icon={
          pendingService?.provider === "github" ? (
            <img
              src={githubUnlinkIcon}
              alt=""
              className="h-[54px] w-[54px]"
              aria-hidden="true"
            />
          ) : pendingService ? (
            <img
              src={pendingService.icon}
              alt=""
              className={
                pendingService.provider === "notion"
                  ? "h-[54px] w-[54px] rounded-[14px] bg-white p-[13px]"
                  : "h-[54px] w-[54px] rounded-[14px]"
              }
              aria-hidden="true"
            />
          ) : null
        }
        title={`${pendingService?.name ?? "GitHub"} 연동을 해제할까요?`}
        description={
          <>
            해제하면 커밋/PR 활동 데이터 수집이 중단되며
            <br />
            기여도 분석 정확도가 낮아질 수 있어요
          </>
        }
        cancelText="취소"
        confirmText="연동 해제"
        destructive
        onCancel={() => setPendingDisconnect(null)}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
