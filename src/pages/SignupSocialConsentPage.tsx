import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../components/AuthHeader";
import {
  TermsAgreementForm,
  requiredChecked,
  type TermsState,
} from "../components/TermsAgreementForm";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";

const initialTerms: TermsState = {
  service: false,
  privacy: false,
  externalTool: false,
  marketing: false,
};

export function SignupSocialConsentPage() {
  const navigate = useNavigate();
  const setTerms = useAuthStore((s) => s.setTerms);
  const [terms, setLocalTerms] = useState<TermsState>(initialTerms);

  const canProceed = requiredChecked(terms);

  const handleNext = () => {
    setTerms(terms);
    // 소셜 로그인은 이메일만 provider로부터 받아온다고 가정 (mock). 실명은 제공되지 않아 프로필 설정 화면에서 별도로 입력받음
    // replace: 가입 완료 후 뒤로가기로 이 단계에 다시 진입하지 않도록 히스토리에 쌓지 않는다.
    navigate("/signup/profile", { replace: true });
  };

  return (
    <div className="app-shell">
      <AuthHeader title="" />

      <div className="flex flex-1 flex-col px-5 pt-2">
        <h1 className="text-h2 font-extrabold leading-snug text-gray-900">
          편리한 서비스 이용을 위해
          <br />
          <span className="text-blue-500">약관에 동의</span>해 주세요
        </h1>

        <div className="mt-6">
          <TermsAgreementForm value={terms} onChange={setLocalTerms} />
        </div>

        <div className="mt-auto pb-8 pt-8">
          <Button size="lg" disabled={!canProceed} onClick={handleNext}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
