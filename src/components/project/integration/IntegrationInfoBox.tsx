import { Info } from "lucide-react";

export function IntegrationInfoBox({ text, heightClass }: { text: string; heightClass: string }) {
  return (
    <div className={`mt-6 flex gap-[6px] rounded-[12px] bg-blue-50 px-[18px] py-3 text-blue-500 ${heightClass}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong className="block text-[12px] font-semibold leading-[18px]">안내</strong>
        <div className="text-[11px] leading-[18px]">
          {text.split("\n").map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>
    </div>
  );
}
