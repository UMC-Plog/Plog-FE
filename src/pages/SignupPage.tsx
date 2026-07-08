import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { SocialLoginButton, type SocialProvider } from "../components/SocialLoginButton";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";

export function SignupPage() {
  const navigate = useNavigate();
  const setSignupMethod = useAuthStore((s) => s.setSignupMethod);

  const handleEmailSignup = () => {
    setSignupMethod("email");
    navigate("/signup/email");
  };

  const handleSocial = (provider: SocialProvider) => {
    setSignupMethod(provider);
    navigate("/signup/social-consent");
  };

  return (
    <div className="app-shell">
      <AuthHeader title="" showBack subtitle={undefined} />

      <div className="flex flex-1 flex-col px-5 pt-2">
        <h1 className="text-h2 font-extrabold text-gray-900">회원가입</h1>
        <p className="mt-3 text-body text-gray-500">
          안녕하세요,
          <br />
          <span className="font-bold text-blue-500">PLOG</span>에 오신 것을 환영해요!
        </p>

        <div className="mt-10 space-y-3">
          <Button variant="outline" size="lg" icon={<span>✉️</span>} onClick={handleEmailSignup}>
            이메일 회원가입
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-caption font-normal text-gray-400">간편 가입</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="space-y-3 pb-8">
          <SocialLoginButton provider="google" onClick={() => handleSocial("google")} />
          <SocialLoginButton provider="kakao" onClick={() => handleSocial("kakao")} />
          <SocialLoginButton provider="naver" onClick={() => handleSocial("naver")} />
        </div>
      </div>
    </div>
  );
}
