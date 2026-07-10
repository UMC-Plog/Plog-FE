import { type FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { SocialLoginButton, type SocialProvider } from "../components/SocialLoginButton";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AlertModal } from "../components/Modal";
import { useAuthStore } from "../store/authStore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);

  const emailError = touched && email.length > 0 && !EMAIL_REGEX.test(email)
    ? "올바른 이메일 형식이 아니에요"
    : undefined;

  const canSubmit = EMAIL_REGEX.test(email) && password.length >= 6;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    // TODO: 실제 로그인 API 연동 (백엔드 완성 전까지 mock)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);

    const mockSuccess = password !== "fail"; // 데모용: "fail" 입력 시 실패 케이스 테스트 가능
    if (!mockSuccess) {
      setLoginFailed(true);
      return;
    }

    login({
      id: crypto.randomUUID(),
      email,
      realName: "홍길동",
      nickname: "바나나",
      avatarId: null,
      avatarImageUrl: null,
    });
    navigate("/home");
  };

  const handleSocial = (provider: SocialProvider) => {
    // TODO: 소셜 로그인 SDK 연동
    console.info(`[TODO] ${provider} 로그인 연동 필요`);
  };

  return (
    <div className="app-shell">
      <AuthHeader title="로그인" subtitle="계정에 로그인하세요" />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 pt-6">
        <div className="space-y-4">
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            errorText={emailError}
            autoComplete="email"
          />
          <Input
            label="비밀번호"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                className="px-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
              </button>
            }
          />
        </div>

        <div className="mt-6">
          <Button type="submit" size="lg" disabled={!canSubmit} loading={loading}>
            로그인
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-body-sm text-gray-500">
          <button type="button" onClick={() => navigate("/find-password")} className="hover:text-gray-700">
            비밀번호 찾기
          </button>
          <span className="text-gray-200">|</span>
          <button type="button" onClick={() => navigate("/signup")} className="hover:text-gray-700">
            회원가입
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-caption font-normal text-gray-400">간편 로그인</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="space-y-3 pb-8">
          <SocialLoginButton provider="google" onClick={() => handleSocial("google")} />
          <SocialLoginButton provider="kakao" onClick={() => handleSocial("kakao")} />
          <SocialLoginButton provider="naver" onClick={() => handleSocial("naver")} />
        </div>
      </form>

      <AlertModal
        open={loginFailed}
        icon={<span className="text-3xl">⚠️</span>}
        title="로그인 실패"
        description="정보를 확인해주세요"
        onConfirm={() => setLoginFailed(false)}
      />
    </div>
  );
}
