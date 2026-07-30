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

const INVITATION_RETURN_PATH_KEY = "project_invitation_return_path";

export function rememberProjectInvitationPath(inviteCode: string) {
  sessionStorage.setItem(
    INVITATION_RETURN_PATH_KEY,
    `/invite/${encodeURIComponent(inviteCode)}`
  );
}

export function consumeProjectInvitationPath(): string | null {
  const path = sessionStorage.getItem(INVITATION_RETURN_PATH_KEY);
  sessionStorage.removeItem(INVITATION_RETURN_PATH_KEY);

  return path && /^\/invite\/[^/]+$/.test(path) ? path : null;
}

export function createProjectInvitationUrl(
  backendInviteUrl: string,
  inviteCode?: string
): string {
  const resolvedInviteCode = inviteCode || getInviteCodeFromUrl(backendInviteUrl);
  if (!resolvedInviteCode) return backendInviteUrl;

  // VITE_FRONTEND_URL이 비어 있어도 초대 링크가 백엔드 주소로 새어 나가지 않도록
  // 현재 접속 중인 프론트 origin을 기본값으로 사용한다.
  const configuredFrontendUrl =
    import.meta.env.VITE_FRONTEND_URL?.trim() || window.location.origin;

  try {
    return new URL(
      `/invite/${encodeURIComponent(resolvedInviteCode)}`,
      configuredFrontendUrl
    ).toString();
  } catch {
    return backendInviteUrl;
  }
}
