import { useState } from "react";
import { Eye, EyeOff, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { PasswordStrengthBar } from "../components/PasswordStrengthBar";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AlertModal } from "../components/Modal";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm
      ? "비밀번호가 일치하지 않아요"
      : undefined;
  const canSubmit = password.length >= 8 && password === passwordConfirm;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: 실제 비밀번호 재설정 API 연동
    setDone(true);
  };

  return (
    <div className="app-shell">
      <AuthHeader title="" showBack />
      <div className="px-5">
        <ProgressBar total={2} current={2} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h1 className="text-h2 font-semibold text-gray-900">비밀번호 재설정</h1>
        <p className="mt-1.5 text-body text-gray-400">가입한 이메일로 비밀번호를 재설정해요</p>

        <div className="mt-6 space-y-4">
          <div>
            <Input
              label="새 비밀번호 입력"
              type={showPassword ? "text" : "password"}
              placeholder="8자 이상, 영문 + 숫자 포함"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            <PasswordStrengthBar password={password} />
          </div>

          <Input
            label="비밀번호 재입력"
            type={showPasswordConfirm ? "text" : "password"}
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            errorText={mismatch}
            suffix={
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((v) => !v)}
                aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 표시"}
                className="px-1 text-gray-400 hover:text-gray-600"
              >
                {showPasswordConfirm ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
              </button>
            }
          />
        </div>

        <div className="mt-auto pb-8 pt-8">
          <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
            완료
          </Button>

          <div className="my-3 h-px w-full bg-gray-100" />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-body-sm text-gray-400 hover:text-gray-600"
            >
              로그인으로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 text-body-sm text-gray-400 hover:text-gray-600"
            >
              <Headphones size={16} strokeWidth={1.7} aria-hidden />
              고객센터 문의하기
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        open={done}
        icon={<span className="text-3xl">✅</span>}
        title="비밀번호가 변경되었어요"
        description="새 비밀번호로 로그인해 주세요"
        confirmText="로그인 하러가기"
        onConfirm={() => navigate("/login")}
      />
    </div>
  );
}
