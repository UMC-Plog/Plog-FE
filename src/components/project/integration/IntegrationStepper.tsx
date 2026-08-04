const STEPS = ["연동 시작", "계정 인증", "데이터 선택", "연동 완료"];

export function IntegrationStepper({ step }: { step: number }) {
  return (
    <div className="flex px-[15px] pb-[17px] pt-[29px]">
      {STEPS.map((label, index) => (
        <div key={label} className="relative flex flex-1 flex-col items-center">
          {index < 3 && (
            <span className="absolute left-[66.6%] top-4 h-px w-[66.7%] border-t border-dashed border-gray-200" />
          )}
          <span
            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[15px] ${
              step === index + 1
                ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_0_3px_#D6E7FE]"
                : "border-gray-200 bg-gray-25 text-gray-400"
            }`}
          >
            {index + 1}
          </span>
          <span className={`mt-4 text-[12px] ${step === index + 1 ? "text-blue-500" : "text-gray-400"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
