import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { Button } from "../components/Button";
import { SocialLoginButton, type SocialProvider } from "../components/SocialLoginButton";
import emailIcon from "../assets/auth/email.png";
import plogWordmark from "../assets/auth/plog-wordmark.svg";
import { useAuthStore } from "../store/authStore";
import { startOAuth } from "../lib/oauth";

export function SignupPage() {
  const navigate = useNavigate();
  const setSignupMethod = useAuthStore((s) => s.setSignupMethod);

  const handleEmailSignup = () => {
    setSignupMethod("email");
    // replace: 가입 완료 후 뒤로가기로 회원가입 단계 화면에 다시 진입하지 않도록,
    // 가입 단계 전환은 히스토리에 쌓지 않고 교체한다.
    navigate("/signup/email", { replace: true });
  };

  const handleSocial = (provider: SocialProvider) => {
    startOAuth(provider);
  };

  return (
    <div className="app-shell">
      <AuthHeader title="" showBack subtitle={undefined} />

      <div className="flex flex-1 flex-col px-5 pt-2">
        <section>
          <h1 className="text-h2 font-semibold text-gray-900">회원가입</h1>

          <div className="mt-8 text-h3 font-normal text-gray-900">
            <p>안녕하세요,</p>
            <p className="flex items-center">
              <img
                src={plogWordmark}
                alt="PLOG"
                className="h-[37px] w-[69px] shrink-0 object-contain"
              />
              <span>에 오신 것을 환영해요!</span>
            </p>
          </div>
        </section>

        <section className="mt-24">
          <Button
            variant="outline"
            size="md"
            icon={
              <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                <img src={emailIcon} alt="" className="h-[15px] w-[19px] object-contain" />
              </span>
            }
            onClick={handleEmailSignup}
          >
            이메일 회원가입
          </Button>

          <div className="my-10 flex h-4 items-center gap-4">
            <div className="h-px flex-1 bg-gray-400" />
            <span className="shrink-0 text-caption font-normal text-gray-400">간편 가입</span>
            <div className="h-px flex-1 bg-gray-400" />
          </div>

          <div className="space-y-4 pb-8">
            <SocialLoginButton provider="google" onClick={() => handleSocial("google")} />
            <SocialLoginButton provider="kakao" onClick={() => handleSocial("kakao")} />
          </div>
        </section>
      </div>
    </div>
  );
}
