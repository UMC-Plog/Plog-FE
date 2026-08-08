import { useState } from "react";
import { useNavigate } from "react-router-dom";
import notificationGuideImage from "../../assets/onboarding/landingpage1.png";
import alertSettingsGuideImage from "../../assets/onboarding/landingpage2.png";
import peerEvalGuideImage from "../../assets/onboarding/landingpage3.png";

// 회원가입 완료 직후 한 번 보여주는 3단계 온보딩 코치마크.
// 세 화면 모두 Figma 목업이 하나로 합쳐진 이미지(804x1748, 2x)를 그대로 사용한다.
const STEPS = [
  {
    src: notificationGuideImage,
    alt: "홈 화면에 추가 안내: iOS에서는 홈 화면에 추가해야 채팅 및 활동 알림을 받을 수 있어요",
  },
  {
    src: alertSettingsGuideImage,
    alt: "알림 설정 안내: 마이페이지 > 알림 설정에서 전체 알림을 켜주세요",
  },
  {
    src: peerEvalGuideImage,
    alt: "Peer 평가 안내: 프로젝트 예상 종료일이 되면 리포트 탭에서 Peer 평가를 시작할 수 있어요",
  },
] as const;

export default function PostSignupGuidePage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const isLastStep = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  const goNext = () => {
    if (isLastStep) {
      navigate("/home", { replace: true });
    } else {
      setStepIndex((current) => current + 1);
    }
  };

  return (
    <GuideImageStep
      src={step.src}
      alt={step.alt}
      ariaLabel={isLastStep ? "온보딩 안내 마치기" : "다음 안내로 이동"}
      onNext={goNext}
    />
  );
}

/**
 * 온보딩 코치마크 한 장(804x1748, 2x Figma 목업 이미지)을 그대로 보여준다. object-contain +
 * object-top으로 비율을 유지한 채 화면 상단에 붙이고, 화면이 이미지보다 길 때 아래쪽에
 * 남는 여백은 이미지와 같은 톤(흰 배경 + 어두운 반투명 오버레이)으로 채워 이어져 보이게 한다.
 */
function GuideImageStep({
  src,
  alt,
  ariaLabel,
  onNext,
}: {
  src: string;
  alt: string;
  ariaLabel: string;
  onNext: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNext}
      aria-label={ariaLabel}
      className="relative flex min-h-svh w-full items-start justify-center bg-gray-25 p-0"
    >
      <div className="absolute inset-0 bg-[rgba(20,22,26,0.9)]" aria-hidden />
      <img src={src} alt={alt} className="relative z-10 h-svh w-full max-w-[402px] object-contain object-top" />
    </button>
  );
}
