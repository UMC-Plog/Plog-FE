const INTEGRATION_RETURN_KEY = "plog_integration_return";

type IntegrationProviderId = "github" | "figma" | "notion" | "docs" | "slides";

const VALID_PROVIDER_IDS: readonly IntegrationProviderId[] = [
  "github",
  "figma",
  "notion",
  "docs",
  "slides",
];

export function rememberIntegrationReturnPath(projectId: string, providerId: string) {
  sessionStorage.setItem(
    INTEGRATION_RETURN_KEY,
    JSON.stringify({ projectId, providerId })
  );
}

export function clearIntegrationReturnPath() {
  sessionStorage.removeItem(INTEGRATION_RETURN_KEY);
}

export function consumeIntegrationReturnPath(): string | null {
  const raw = sessionStorage.getItem(INTEGRATION_RETURN_KEY);
  sessionStorage.removeItem(INTEGRATION_RETURN_KEY);

  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as {
      projectId?: unknown;
      providerId?: unknown;
    };

    if (typeof value.projectId !== "string" || !/^\d+$/.test(value.projectId)) {
      return null;
    }
    if (
      typeof value.providerId !== "string" ||
      !VALID_PROVIDER_IDS.includes(value.providerId as IntegrationProviderId)
    ) {
      return null;
    }

    return `/project/${value.projectId}/settings/integrations/${value.providerId}`;
  } catch {
    return null;
  }
}
