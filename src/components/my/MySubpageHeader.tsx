import { ChevronLeft } from "lucide-react";

interface MySubpageHeaderProps {
  title: string;
  onBack: () => void;
}

export function MySubpageHeader({ title, onBack }: MySubpageHeaderProps) {
  return (
    <header className="flex h-[58px] shrink-0 items-center border-b border-gray-100 bg-gray-25 px-[18px] shadow-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로가기"
        className="flex h-8 w-8 items-center justify-center text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="ml-[7px] text-[18px] font-bold leading-[25px] text-gray-900">{title}</h1>
    </header>
  );
}
