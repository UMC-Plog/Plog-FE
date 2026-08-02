import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { oauthLogin, fetchProfile } from "../api/auth";
import { ApiError } from "../api/client";
import { consumeOAuthState, type SocialOAuthProvider } from "../lib/oauth";
import { toAvatarId } from "../lib/profilePreset";
import { useAuthStore } from "../store/authStore";
import { AlertModal } from "../components/Modal";
import { consumeProjectInvitationPath } from "../lib/projectInvitation";

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: SocialOAuthProvider }>();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setSignupMethod = useAuthStore((s) => s.setSignupMethod);
  const setSignupField = useAuthStore((s) => s.setSignupField);
  const called = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (called.current || !provider) return;
    called.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);

      if (params.get("error")) {
        navigate("/login", { replace: true });
        return;
      }

      const code = params.get("code");
      const savedState = consumeOAuthState(provider);
      if (!code || !savedState || savedState !== params.get("state")) {
        setErrorMessage("잘못된 접근이에요. 다시 시도해 주세요.");
        return;
      }

      try {
        const result = await oauthLogin(provider, code);

        if (result.status === "LOGIN" && result.accessToken && result.refreshToken) {
          const tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
          const profile = await fetchProfile(tokens.accessToken);
          login(
            {
              id: crypto.randomUUID(),
              email: profile.email,
              realName: profile.name,
              nickname: profile.nickname,
              avatarId: toAvatarId(profile.profilePreset),
              avatarImageUrl: null,
            },
            tokens
          );
          navigate(consumeProjectInvitationPath() ?? "/home", { replace: true });
          return;
        }

        if (result.status === "SIGNUP_REQUIRED" && result.ticket && result.email) {
          setSignupMethod(provider);
          setSignupField("email", result.email);
          setSignupField("ticket", result.ticket);
          navigate("/signup/social-consent", { replace: true });
          return;
        }

        setErrorMessage("로그인 처리 중 문제가 발생했어요.");
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          throw err;
        }
      }
    };

    run();
  }, [provider, navigate, login, setSignupMethod, setSignupField]);

  return (
    <div className="app-shell items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
        aria-hidden
      />

      <AlertModal
        open={errorMessage !== null}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-error/10">
            <AlertCircle className="h-6 w-6 text-error" strokeWidth={2} aria-hidden />
          </span>
        }
        title="소셜 로그인에 실패했어요"
        description={errorMessage ?? undefined}
        onConfirm={() => navigate("/login", { replace: true })}
      />
    </div>
  );
}
