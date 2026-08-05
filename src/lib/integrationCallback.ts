const INTEGRATION_RETURN_KEY = "plog_integration_return";
const INTEGRATION_RETURN_TTL_MS = 30 * 60 * 1000;

type IntegrationProviderId = "github" | "figma" | "notion" | "docs" | "slides";

const VALID_PROVIDER_IDS: readonly IntegrationProviderId[] = [
  "github",
  "figma",
  "notion",
  "docs",
  "slides",
];

type IntegrationReturnValue = {
  projectId: string;
  providerId: IntegrationProviderId;
  savedAt: number;
};

function setStorageValue(storage: Storage, value: string) {
  try {
    storage.setItem(INTEGRATION_RETURN_KEY, value);
  } catch {
    // 일부 모바일 브라우저의 제한 모드에서는 저장소 접근이 실패할 수 있다.
  }
}

function getStorageValue(storage: Storage): string | null {
  try {
    return storage.getItem(INTEGRATION_RETURN_KEY);
  } catch {
    return null;
  }
}

function removeStorageValue(storage: Storage) {
  try {
    storage.removeItem(INTEGRATION_RETURN_KEY);
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 삭제할 값도 없으므로 무시한다.
  }
}

export function rememberIntegrationReturnPath(projectId: string, providerId: string) {
  const value = JSON.stringify({ projectId, providerId, savedAt: Date.now() });

  setStorageValue(sessionStorage, value);
  // 외부 앱이나 새 탭을 거치면 sessionStorage가 전달되지 않을 수 있어
  // 동일 origin의 탭에서 공유되는 localStorage를 복귀 정보의 fallback으로 사용한다.
  setStorageValue(localStorage, value);
}

export function clearIntegrationReturnPath() {
  removeStorageValue(sessionStorage);
  removeStorageValue(localStorage);
}

export function consumeIntegrationReturnPath(): string | null {
  const candidates = [
    getStorageValue(sessionStorage),
    getStorageValue(localStorage),
  ];
  clearIntegrationReturnPath();

  for (const raw of candidates) {
    if (!raw) continue;

    try {
      const value = JSON.parse(raw) as Partial<IntegrationReturnValue>;

      if (typeof value.projectId !== "string" || !/^\d+$/.test(value.projectId)) {
        continue;
      }
      if (
        typeof value.providerId !== "string" ||
        !VALID_PROVIDER_IDS.includes(value.providerId as IntegrationProviderId)
      ) {
        continue;
      }
      if (
        typeof value.savedAt !== "number" ||
        !Number.isFinite(value.savedAt) ||
        value.savedAt > Date.now() ||
        Date.now() - value.savedAt > INTEGRATION_RETURN_TTL_MS
      ) {
        continue;
      }

      return `/project/${value.projectId}/settings/integrations/${value.providerId}`;
    } catch {
      // sessionStorage 값이 손상됐다면 localStorage fallback을 이어서 확인한다.
    }
  }

  return null;
}
