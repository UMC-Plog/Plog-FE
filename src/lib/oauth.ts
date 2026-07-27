export type SocialOAuthProvider = "kakao" | "google";

interface ProviderConfig {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}

const PROVIDERS: Record<SocialOAuthProvider, ProviderConfig> = {
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    clientId: import.meta.env.VITE_KAKAO_REST_API_KEY,
    redirectUri: `${window.location.origin}/oauth/kakao`,
  },
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/oauth/google`,
    scope: "openid email",
  },
};

// 카카오/구글 로그인 화면으로 브라우저 전체를 이동시킴 (CORS 때문에 fetch로 호출 불가)
export function startOAuth(provider: SocialOAuthProvider) {
  const config = PROVIDERS[provider];

  const state = crypto.randomUUID();
  sessionStorage.setItem(`oauth_state_${provider}`, state);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
    prompt: "select_account",
  });
  if (config.scope) params.set("scope", config.scope);

  window.location.href = `${config.authorizeUrl}?${params}`;
}

export function consumeOAuthState(provider: SocialOAuthProvider) {
  const key = `oauth_state_${provider}`;
  const saved = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  return saved;
}
