import { useState } from "react";
import { AlertCircle, Headphones, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AlertModal } from "../components/Modal";
import { sendPasswordResetCode, verifyPasswordResetCode } from "../api/auth";
import { ApiError } from "../api/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FindPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const emailValid = EMAIL_REGEX.test(email);

  const handleSendCode = async () => {
    if (!emailValid || sending) return;

    setSending(true);
    try {
      await sendPasswordResetCode(email.trim());
      setSent(true);
      setCode("");
      setCodeError(undefined);
      setVerified(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSendErrorMessage(err.message);
      } else {
        throw err;
      }
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.trim().length !== 6 || verifying) return;

    setVerifying(true);
    try {
      await verifyPasswordResetCode(email.trim(), code.trim());
      setVerified(true);
      setCodeError(undefined);
    } catch (err) {
      if (err instanceof ApiError) {
        setVerified(false);
        setCodeError(err.message);
      } else {
        throw err;
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleNext = () => {
    if (!verified) return;
    navigate("/reset-password", { state: { email: email.trim() } });
  };

  return (
    <div className="app-shell">
      <AuthHeader title="" showBack />
      <div className="px-5">
        <ProgressBar total={2} current={1} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <h1 className="text-h2 font-semibold text-gray-900">비밀번호 찾기</h1>
        <p className="mt-1.5 text-body text-gray-400">가입한 이메일로 비밀번호를 재설정해요</p>

        <div className="mt-6 space-y-4">
          <Input
            label="가입한 이메일 주소"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
              setVerified(false);
            }}
          />

          <Button
            variant="primary"
            size="lg"
            onClick={handleSendCode}
            disabled={!emailValid || sending}
            loading={sending}
          >
            인증 코드 발송
          </Button>

          {sent && (
            <div>
              <div className="flex items-center gap-2">
                <Info size={20} className="shrink-0 text-[#3182F6]" strokeWidth={1.7} aria-hidden />
                <p className="text-body font-bold text-gray-900">이메일이 오지 않나요?</p>
              </div>
              <p className="mt-2 text-body-sm font-normal leading-[1.4] text-gray-400">
                스팸함을 확인하거나 1-2분 후 다시 시도해보세요.
                <br />
                문제가 지속되면 고객센터로 문의해 주세요.
              </p>
            </div>
          )}

          {sent && (
            <div>
              <Input
                label="인증번호 확인"
                placeholder="인증번호 입력"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(undefined);
                  setVerified(false);
                }}
                maxLength={6}
                errorText={codeError}
                suffix={
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={code.trim().length !== 6 || verifying}
                    className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-normal text-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {verifying ? "확인 중" : "확인"}
                  </button>
                }
              />
              {verified && (
                <p className="mt-1.5 flex items-center gap-1 text-caption font-normal text-success">
                  ✓ 인증이 완료되었습니다
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pb-8 pt-8">
          <Button size="lg" disabled={!verified} onClick={handleNext}>
            다음
          </Button>

          <div className="my-3 h-px w-full bg-gray-100" />

          <div className="flex justify-end">
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
        open={sendErrorMessage !== null}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-error/10">
            <AlertCircle className="h-6 w-6 text-error" strokeWidth={2} aria-hidden />
          </span>
        }
        title="인증코드를 발송하지 못했어요"
        description={sendErrorMessage ?? undefined}
        onConfirm={() => setSendErrorMessage(null)}
      />
    </div>
  );
}
