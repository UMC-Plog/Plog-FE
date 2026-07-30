function getInviteCodeFromUrl(inviteUrl: string): string | null {
  try {
    const url = new URL(inviteUrl);
    const queryCode = url.searchParams.get("inviteCode");
    if (queryCode) return queryCode;

    const segments = url.pathname.split("/").filter(Boolean);
    const inviteIndex = segments.lastIndexOf("invite");
    return inviteIndex >= 0 ? segments[inviteIndex + 1] ?? null : segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

export function createProjectInvitationUrl(
  backendInviteUrl: string,
  inviteCode?: string
): string {
  const resolvedInviteCode = inviteCode || getInviteCodeFromUrl(backendInviteUrl);
  if (!resolvedInviteCode) return backendInviteUrl;

  const configuredFrontendUrl = import.meta.env.VITE_FRONTEND_URL?.trim();
  if (!configuredFrontendUrl) return backendInviteUrl;

  try {
    return new URL(
      `/invite/${encodeURIComponent(resolvedInviteCode)}`,
      configuredFrontendUrl
    ).toString();
  } catch {
    return backendInviteUrl;
  }
}
