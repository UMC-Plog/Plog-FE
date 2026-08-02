import type { SVGProps } from "react";
import { Menu } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ProjectViewMode } from "../../types/project";

interface ProjectViewToggleProps {
  value: ProjectViewMode;
  onChange: (value: ProjectViewMode) => void;
}

function GalleryIcon({ size = 17, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" {...props}>
      <rect x="3.25" y="3.25" width="4.7" height="4.7" rx="1" stroke="currentColor" strokeWidth="1.06" />
      <rect x="10.05" y="3.25" width="4.7" height="4.7" rx="1" stroke="currentColor" strokeWidth="1.06" />
      <rect x="3.25" y="10.05" width="4.7" height="4.7" rx="1" stroke="currentColor" strokeWidth="1.06" />
      <rect x="10.05" y="10.05" width="4.7" height="4.7" rx="1" stroke="currentColor" strokeWidth="1.06" />
    </svg>
  );
}

const VIEW_OPTIONS = [
  { value: "list" as const, label: "리스트 보기", icon: Menu },
  { value: "grid" as const, label: "갤러리 보기", icon: GalleryIcon },
];

export function ProjectViewToggle({ value, onChange }: ProjectViewToggleProps) {
  return (
    <div
      className="flex h-8 w-[72px] items-center gap-px rounded-full border border-gray-200 bg-white px-[5px]"
      role="group"
      aria-label="프로젝트 보기 방식"
    >
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-full flex-1 items-center justify-center text-gray-400 transition-colors hover:text-gray-600",
              selected && "text-blue-500"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-[29px] items-center justify-center rounded-full",
                selected && "bg-blue-100"
              )}
            >
              <Icon size={17} aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
