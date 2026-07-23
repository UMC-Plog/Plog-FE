import { useState } from "react";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { MySubpageHeader } from "../../components/my/MySubpageHeader";
import { useAuthStore } from "../../store/authStore";

const WARNINGS = [
  { title: "데이터 삭제", description: "모든 활동 기록과 리포트가 영구 삭제됩니다" },
  { title: "리포트 소멸", description: "생성된 PDF 리포트를 다운로드할 수 없습니다" },
  { title: "프로젝트 퇴장", description: "참여 중인 모든 프로젝트에서 자동 퇴장됩니다" },
];

export function WithdrawPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [agreed, setAgreed] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (completed) {
    return (
      <Layout className="min-h-svh items-center bg-gray-25 px-8 text-center">
        <main className="flex w-full flex-1 flex-col items-center justify-center pb-10">
          <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-blue-100 text-aqua-500">
            <Check size={52} strokeWidth={4.5} aria-hidden="true" />
          </span>
          <h1 className="mt-7 text-[28px] font-bold leading-[39px] text-blue-800">
            탈퇴가 완료되었습니다
          </h1>
          <p className="mt-2 text-[15px] font-normal leading-[22px] text-blue-800">
            그동안 플로그를 이용해주셔서 감사합니다
            <br />
            언제든 다시 돌아오실 수 있어요
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-7 h-14 w-full rounded-[14px] bg-blue-500 text-[16px] font-semibold text-white"
          >
            처음 화면으로
          </button>
          <p className="mt-4 text-[12px] font-normal leading-[17px] text-gray-400">
            계정 데이터는 7일 후 완전히 삭제됩니다
          </p>
        </main>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-svh bg-gray-25">
      <MySubpageHeader title="회원 탈퇴" onBack={() => navigate("/my")} />

      <main className="flex-1 px-[22px] pt-8">
        <h2 className="text-[22px] font-bold leading-[30px] text-gray-900">정말 탈퇴하시겠어요?</h2>
        <p className="mt-1 text-[14px] font-normal leading-[20px] text-gray-400">
          탈퇴 전에 아래 내용을 꼭 확인해주세요
        </p>

        <div className="mt-6 space-y-3">
          {WARNINGS.map((warning) => (
            <section key={warning.title} className="flex h-[77px] flex-col justify-center rounded-16 bg-gray-100 px-[18px]">
              <h3 className="text-[15px] font-semibold leading-[21px] text-gray-900">{warning.title}</h3>
              <p className="mt-1 text-[14px] font-normal leading-[20px] text-gray-400">{warning.description}</p>
            </section>
          ))}
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-[22px] pb-[26px] pt-4">
        <label className="flex cursor-pointer items-center gap-[10px] text-[14px] font-normal leading-5 text-gray-900">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="peer sr-only"
          />
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm border border-gray-400 bg-white text-white peer-checked:border-gray-500 peer-checked:bg-gray-500">
            {agreed && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
          </span>
          위 내용을 확인했으며 탈퇴에 동의합니다
        </label>
        <button
          type="button"
          disabled={!agreed}
          onClick={() => {
            logout();
            setCompleted(true);
          }}
          className="mt-3 h-14 w-full rounded-[14px] bg-error text-[16px] font-semibold text-white disabled:bg-gray-100 disabled:text-gray-400"
        >
          탈퇴 진행하기
        </button>
        <button
          type="button"
          onClick={() => navigate("/my")}
          className="mt-4 h-8 w-full text-[15px] font-semibold text-gray-400"
        >
          취소
        </button>
      </footer>
    </Layout>
  );
}
