import { CheckCircle2 } from "lucide-react";

export function IntegrationStartStep({
  items,
  guide,
  guideHeadingClass,
  guideClass,
  authError,
}: {
  items: string[];
  guide: string[];
  guideHeadingClass: string;
  guideClass: string;
  authError: string | null;
}) {
  return (
    <>
      <h3 className="mt-6 text-[15px] text-gray-700">연동 시 가져오는 데이터</h3>
      <div className="mt-3 grid grid-cols-[193px_1fr] gap-y-2">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-2 text-[13px] text-gray-700">
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 fill-blue-500 text-white" />
            {item}
          </span>
        ))}
      </div>
      <h3 className={`${guideHeadingClass} text-[15px] text-gray-700`}>연동 안내</h3>
      <div className={`mt-3 rounded-[12px] bg-blue-50 px-4 py-[13px] text-[11px] leading-5 text-gray-500 ${guideClass}`}>
        {guide.map((line) => (
          <p key={line} className="flex items-center gap-[7px] whitespace-nowrap pl-px">
            <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-gray-500" aria-hidden="true" />
            <span>{line}</span>
          </p>
        ))}
      </div>
      {authError && <p className="mt-3 text-[12px] leading-[18px] text-error" role="alert">{authError}</p>}
    </>
  );
}
