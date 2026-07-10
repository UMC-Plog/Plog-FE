import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FindPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const emailValid = EMAIL_REGEX.test(email);

  const handleSendCode = () => {
    if (!emailValid) return;
    setSent(true);
    // TODO: 실제 인증코드 발송 API 연동
  };

  const handleVerify = () => {
    // TODO: 실제 인증코드 검증 API 연동 (데모: 6자리면 통과)
    if (code.trim().length === 6) {
      navigate("/reset-password");
    } else {
      setCodeError(true);
    }
  };

  return (
    <div className="app-shell">
      <div className="px-5 pt-4">
        <AuthHeader title="" showBack />
        <ProgressBar total={2} current={1} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h1 className="text-h2 font-extrabold text-gray-900">비밀번호 찾기</h1>
        <p className="mt-1.5 text-body text-gray-500">가입한 이메일로 비밀번호를 재설정해요</p>

        <div className="mt-6 space-y-4">
          <Input
            label="가입한 이메일 주소"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />

          <Button variant="outline" onClick={handleSendCode} disabled={!emailValid}>
            인증 코드 발송
          </Button>

          {sent && (
            <div className="rounded-md bg-blue-50 px-3.5 py-3 text-body-sm text-blue-600">
              <p className="font-semibold">ℹ️ 이메일이 오지 않나요?</p>
              <p className="mt-1 text-caption font-normal text-blue-500">
                스팸함을 확인하거나 1-2분 후 다시 시도해보세요.
                <br />
                문제가 지속되면 고객센터로 문의해 주세요.
              </p>
            </div>
          )}

          {sent && (
            <Input
              label="인증코드 입력"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(false);
              }}
              maxLength={6}
              errorText={codeError ? "인증코드가 올바르지 않아요" : undefined}
              suffix={
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={code.trim().length !== 6}
                  className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  확인
                </button>
              }
            />
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 pb-8 pt-8">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-body-sm text-gray-400 hover:text-gray-600"
          >
            고객센터 문의하기
          </button>
        </div>
      </div>
    </div>
  );
}
