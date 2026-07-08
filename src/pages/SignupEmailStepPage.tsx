import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import { PasswordStrengthBar } from "../components/PasswordStrengthBar";
import { ProgressBar } from "../components/ProgressBar";
import {
  TermsAgreementForm,
  requiredChecked,
  type TermsState,
} from "../components/TermsAgreementForm";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AlertModal } from "../components/Modal";
import { useAuthStore } from "../store/authStore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// TODO: 실제 API 연동 시 서버 중복확인 엔드포인트로 교체
const REGISTERED_EMAILS = ["hello@plog.com"];

const initialTerms: TermsState = {
  service: false,
  privacy: false,
  externalTool: false,
  marketing: false,
};

type Step = "terms" | "info";

export function SignupEmailStepPage() {
  const navigate = useNavigate();
  const setTerms = useAuthStore((s) => s.setTerms);
  const setSignupField = useAuthStore((s) => s.setSignupField);

  const [step, setStep] = useState<Step>("terms");

  // step 1: 약관
  const [terms, setLocalTerms] = useState<TermsState>(initialTerms);

  // step 2: 정보 입력
  const [realName, setRealName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const emailFormatValid = EMAIL_REGEX.test(email);
  const emailError =
    email.length > 0 && !emailFormatValid ? "올바른 이메일 형식이 아니에요" : undefined;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm
      ? "비밀번호가 일치하지 않아요"
      : undefined;

  const canSubmitInfo = useMemo(
    () =>
      realName.trim().length > 0 &&
      emailVerified &&
      password.length >= 8 &&
      password === passwordConfirm,
    [realName, emailVerified, password, passwordConfirm]
  );

  const handleTermsNext = () => {
    setTerms(terms);
    setStep("info");
  };

  const handleSendCode = () => {
    if (!emailFormatValid) return;
    if (REGISTERED_EMAILS.includes(email.trim())) {
      setAlreadyRegistered(true);
      return;
    }
    setEmailSent(true);
    // TODO: 실제 이메일 인증 코드 발송 API 연동
  };

  const handleVerifyCode = () => {
    // TODO: 실제 인증코드 검증 API 연동 (데모: 6자리면 통과)
    if (code.trim().length === 6) {
      setEmailVerified(true);
    }
  };

  const handleSubmit = () => {
    if (!canSubmitInfo) return;
    setSignupField("realName", realName.trim());
    setSignupField("email", email.trim());
    setSignupField("isEmailVerified", true);
    setSignupField("password", password);
    setCompleteModalOpen(true);
  };

  return (
    <div className="app-shell">
      <div className="px-5 pt-4">
        <AuthHeader title="" showBack />
        <ProgressBar total={2} current={step === "terms" ? 1 : 2} />
      </div>

      {step === "terms" && (
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="text-h2 font-extrabold leading-snug text-gray-900">
            편리한 서비스 이용을 위해
            <br />
            <span className="text-blue-500">약관에 동의</span>해 주세요
          </h1>
          <div className="mt-6">
            <TermsAgreementForm value={terms} onChange={setLocalTerms} />
          </div>
          <div className="mt-auto pb-8 pt-8">
            <Button size="lg" disabled={!requiredChecked(terms)} onClick={handleTermsNext}>
              다음
            </Button>
          </div>
        </div>
      )}

      {step === "info" && (
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="text-h2 font-extrabold text-gray-900">회원가입</h1>

          <div className="mt-6 space-y-4">
            <Input
              label="실명"
              helperText="*반드시 실명으로 설정하셔야 하며, 가입 후 1회만 변경가능합니다"
              placeholder="홍길동"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />

            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailSent(false);
                setEmailVerified(false);
              }}
              errorText={emailError}
              successText={
                emailVerified ? "인증이 완료되었습니다" : emailSent ? "인증번호를 전송했습니다" : undefined
              }
              locked={emailVerified}
              suffix={
                !emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!emailFormatValid}
                    className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    코드 전송
                  </button>
                )
              }
            />

            {emailSent && !emailVerified && (
              <Input
                label="인증번호 확인"
                placeholder="인증번호 입력"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                suffix={
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={code.trim().length !== 6}
                    className="h-9 shrink-0 rounded-md bg-gray-100 px-3 text-body-sm font-semibold text-gray-600 disabled:text-gray-300"
                  >
                    확인
                  </button>
                }
              />
            )}

            <div>
              <Input
                label="비밀번호"
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
              label="비밀번호 확인"
              type={showPasswordConfirm ? "text" : "password"}
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              errorText={passwordMismatch}
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
            <Button size="lg" disabled={!canSubmitInfo} onClick={handleSubmit}>
              다음
            </Button>
          </div>
        </div>
      )}

      <AlertModal
        open={alreadyRegistered}
        icon={<span className="text-3xl">👤</span>}
        title="해당 이메일은 유가입자로 확인됩니다"
        confirmText="로그인 하러가기"
        onConfirm={() => navigate("/login")}
      />

      <AlertModal
        open={completeModalOpen}
        icon={<span className="text-3xl">✅</span>}
        title="회원가입이 완료되었어요"
        description="이어서 프로필을 설정해 주세요"
        confirmText="다음"
        onConfirm={() => navigate("/signup/profile")}
      />
    </div>
  );
}
