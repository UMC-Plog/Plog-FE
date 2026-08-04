import { Info } from "lucide-react";

export function IntegrationInfoBox({
  text,
  heightClass,
  textSizeClass = "text-[12px]",
}: {
  text: string;
  heightClass: string;
  textSizeClass?: string;
}) {
  return (
    <div className={`mt-6 flex gap-[6px] rounded-[12px] bg-blue-50 px-[18px] py-3 text-blue-500 ${heightClass}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong className={`block font-semibold leading-[18px] ${textSizeClass}`}>안내</strong>
        <div className={`mt-1 font-normal leading-4 ${textSizeClass}`}>
          {text.split("\n").map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>
    </div>
  );
}
