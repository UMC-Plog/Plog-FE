import { getIntegrationStatus } from "../api/integrationApi";
import type { IntegrationItemResponse, IntegrationLinkType } from "../types/integration";

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 5 * 60 * 1000;
/** 사용자가 승인 창을 닫은 뒤에도 서버 콜백이 늦게 도착할 수 있어 몇 번 더 확인한다 */
const POLLS_AFTER_WINDOW_CLOSED = 3;

/**
 * provider 승인 창을 미리 연다.
 * 팝업 차단을 피하려면 반드시 클릭 핸들러 안에서 동기적으로 호출해야 한다
 * (연동 URL 발급 API를 await한 뒤에 열면 사용자 제스처가 끊겨 차단된다).
 */
export function openBlankAuthWindow() {
  return window.open("", "plog-integration-auth", "width=520,height=720");
}

/** setTimeout 대기. 백그라운드 탭에서 타이머가 지연되므로 화면 복귀 시에도 즉시 깨운다 */
function delay(ms: number) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resolve();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") finish();
    };

    const timer = setTimeout(finish, ms);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });
}

interface WaitForIntegrationLinkedOptions {
  projectId: string;
  linkType: IntegrationLinkType;
  /** 승인 창. 닫히면 조금 더 확인한 뒤 대기를 끝낸다 */
  authWindow: Window | null;
  signal?: AbortSignal;
}

/**
 * provider 콜백은 백엔드가 처리하므로 프론트에는 결과가 직접 전달되지 않는다.
 * 연동 상태 조회를 폴링해서 linked=true가 될 때까지 기다린다.
 * 연결되면 해당 provider 상태를, 실패/취소/타임아웃이면 null을 돌려준다.
 */
export async function waitForIntegrationLinked({
  projectId,
  linkType,
  authWindow,
  signal,
}: WaitForIntegrationLinkedOptions): Promise<IntegrationItemResponse | null> {
  const deadline = Date.now() + MAX_WAIT_MS;
  let pollsAfterClose = 0;

  while (Date.now() < deadline && !signal?.aborted) {
    await delay(POLL_INTERVAL_MS);
    if (signal?.aborted) return null;

    try {
      const status = await getIntegrationStatus(projectId);
      const integration = status.integrations.find((item) => item.linkType === linkType);
      if (integration?.linked) return integration;
    } catch {
      // 승인 도중의 일시적인 조회 실패는 무시하고 계속 폴링한다
    }

    if (authWindow?.closed) {
      pollsAfterClose += 1;
      if (pollsAfterClose >= POLLS_AFTER_WINDOW_CLOSED) return null;
    }
  }

  return null;
}
