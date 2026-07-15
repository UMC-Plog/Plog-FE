import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { Layout } from "../../components/Layout";
import { useAuthStore } from "../../store/authStore";

const WITHDRAWAL_NOTICES = [
  {
    title: "데이터 삭제",
    description: "모든 활동 기록과 리포트가 영구 삭제됩니다",
  },
  {
    title: "리포트 소멸",
    description: "생성된 PDF 리포트를 다운로드할 수 없습니다",
  },
  {
    title: "프로젝트 퇴장",
    description: "참여 중인 모든 프로젝트에서 자동 퇴장됩니다",
  },
];

export function WithdrawPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const submitStartedRef = useRef(false);

  const handleWithdraw = () => {
    if (!agreed || submitting || submitStartedRef.current) return;

    submitStartedRef.current = true;
    setSubmitting(true);
    logout();
    setCompleted(true);
    setSubmitting(false);
  };

  if (completed) {
    return (
      <Layout className="bg-gray-25">
        <main className="flex flex-1 items-center justify-center px-8 py-8 text-center">
          <div
            className="flex w-full flex-col items-center"
            role="status"
            aria-live="polite"
          >
            <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-blue-100">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="withdraw-check" x1="24" y1="8" x2="24" y2="40">
                    <stop stopColor="#2186FB" />
                    <stop offset="1" stopColor="#06BCC4" />
                  </linearGradient>
                </defs>
                <path
                  d="M9 25L19 35L40 13"
                  stroke="url(#withdraw-check)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="mt-8 text-h2 font-bold text-navy-700">탈퇴가 완료되었습니다</h1>
            <p className="mt-3 text-body text-navy-700">
              그동안 플로그를 이용해주셔서 감사합니다
              <span className="block">언제든 다시 돌아오실 수 있어요</span>
            </p>
            <Button
              type="button"
              size="lg"
              onClick={() => navigate("/", { replace: true })}
              className="mt-8"
            >
              처음 화면으로
            </Button>
            <p className="mt-4 text-center text-caption font-normal text-gray-400">
              계정 데이터는 7일 후 완전히 삭제됩니다
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout className="bg-gray-25">
      <AuthHeader title="회원 탈퇴" variant="inline" onBack={() => navigate("/my")} />

      <main className="flex-1 px-[22px] pt-8">
        <h2 className="text-h3 font-bold text-gray-900">정말 탈퇴하시겠어요?</h2>
        <p className="mt-2 text-body-sm text-gray-400">
          탈퇴 전에 아래 내용을 꼭 확인해주세요
        </p>

        <ul className="mt-6 space-y-3">
          {WITHDRAWAL_NOTICES.map((notice) => (
            <li
              key={notice.title}
              className="flex h-[77px] flex-col justify-center rounded-[16px] bg-gray-100 px-4"
            >
              <strong className="block text-body font-semibold text-gray-900">
                {notice.title}
              </strong>
              <p className="mt-0.5 text-body-sm text-gray-400">{notice.description}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mt-auto border-t border-gray-100 bg-white px-[22px] pb-4 pt-4">
        <label
          htmlFor="withdraw-agreement"
          className="flex cursor-pointer items-center gap-3 text-body-sm text-gray-700"
        >
          <input
            id="withdraw-agreement"
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={submitting}
            className="sr-only"
          />
          <span
            className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm border ${
              agreed ? "border-gray-500 bg-gray-500 text-white" : "border-gray-300 bg-white"
            }`}
            aria-hidden="true"
          >
            {agreed && <Check size={15} strokeWidth={2.5} />}
          </span>
          <span>위 내용을 확인했으며 탈퇴에 동의합니다</span>
        </label>

        <Button
          type="button"
          variant="danger"
          size="lg"
          loading={submitting}
          disabled={!agreed || submitting}
          onClick={handleWithdraw}
          className="mt-3"
          aria-busy={submitting}
        >
          탈퇴 진행하기
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          disabled={submitting}
          onClick={() => navigate("/my")}
          className="mt-2 text-gray-400"
        >
          취소
        </Button>
      </footer>
    </Layout>
  );
}
