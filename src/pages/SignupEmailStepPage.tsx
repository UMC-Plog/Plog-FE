import { useMemo, useState } from "react";
import { Eye, EyeOff, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { AuthHeader } from "../components/AuthHeader";
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
import { sendEmailVerificationCode, verifyEmailCode } from "../api/auth";
import { ApiError } from "../api/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialTerms: TermsState = {
  service: false,
  privacy: false,
  externalTool: false,
  marketing: false,
};

type Step = "terms" | "info";

/** Figma: 이메일 인증 완료 모달 체크 아이콘 — 세로 그라데이션 #2186FB -> #07BCC5 */
function GradientCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <defs>
        <linearGradient id="signup-email-verified-check" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2186FB" />
          <stop offset="1" stopColor="#07BCC5" />
        </linearGradient>
      </defs>
      <path
        d="M20 6 9 17l-5-5"
        stroke="url(#signup-email-verified-check)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [infoTermsAgreed, setInfoTermsAgreed] = useState(false);

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
      password === passwordConfirm &&
      infoTermsAgreed,
    [realName, emailVerified, password, passwordConfirm, infoTermsAgreed]
  );

  const handleTermsNext = () => {
    setTerms(terms);
    setStep("info");
  };

  const handleSendCode = async () => {
    if (!emailFormatValid || sendingCode) return;

    setSendingCode(true);
    try {
      await sendEmailVerificationCode(email.trim());
      setEmailSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setAlreadyRegistered(true);
      } else {
        throw err;
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.trim().length !== 6 || verifyingCode) return;

    setVerifyingCode(true);
    try {
      await verifyEmailCode(email.trim(), code.trim());
      setEmailVerified(true);
      setCodeError(undefined);
    } catch (err) {
      if (err instanceof ApiError) {
        setCodeError(err.message);
      } else {
        throw err;
      }
    } finally {
      setVerifyingCode(false);
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
      <AuthHeader title="" showBack />
      <div className="px-5">
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
              successText={emailSent ? "인증번호를 전송했습니다" : undefined}
              suffix={
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!emailFormatValid || sendingCode}
                  className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {sendingCode ? "전송 중" : "코드 전송"}
                </button>
              }
            />

            <Input
              label="인증번호 확인"
              placeholder="인증번호 입력"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(undefined);
                setEmailVerified(false);
              }}
              maxLength={6}
              errorText={codeError}
              successText={emailVerified ? "인증이 완료되었습니다" : undefined}
              suffix={
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={code.trim().length !== 6 || verifyingCode}
                  className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {verifyingCode ? "확인 중" : "확인"}
                </button>
              }
            />

            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <label htmlFor="signup-password" className="text-body font-normal text-gray-900">
                  비밀번호
                </label>
                <span className="text-caption font-normal text-gray-400">
                  *영문+숫자 조합 8~16자 이내로 입력해주세요
                </span>
              </div>
              <Input
                id="signup-password"
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

          <button
            type="button"
            onClick={() => setInfoTermsAgreed((v) => !v)}
            aria-pressed={infoTermsAgreed}
            className="mt-6 flex items-center gap-2.5 text-left"
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border transition-colors",
                infoTermsAgreed ? "border-blue-500 bg-blue-500 text-white" : "border-gray-400 bg-white"
              )}
            >
              {infoTermsAgreed && (
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6.2 4.8 8.5 9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-body font-normal text-gray-900">
              이용약관 및 개인정보처리방침에 동의합니다
            </span>
          </button>

          <div className="mt-auto pb-8 pt-8">
            <Button size="lg" disabled={!canSubmitInfo} onClick={handleSubmit}>
              다음
            </Button>
          </div>
        </div>
      )}

      <AlertModal
        open={alreadyRegistered}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-blue-100">
            <User className="h-6 w-6 text-navy-700" strokeWidth={2} aria-hidden />
          </span>
        }
        title="해당 이메일은 유가입자로 확인됩니다"
        confirmText="로그인 하러가기"
        onConfirm={() => navigate("/login")}
      />

      <AlertModal
        open={completeModalOpen}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-blue-100">
            <GradientCheck />
          </span>
        }
        title="이메일 인증이 완료되었어요"
        description="이어서 프로필을 설정해 주세요"
        confirmText="다음"
        onConfirm={() => navigate("/signup/profile")}
      />
    </div>
  );
}
