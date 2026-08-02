import { Grid2X2, List } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ProjectViewMode } from "../../types/project";

interface ProjectViewToggleProps {
  value: ProjectViewMode;
  onChange: (value: ProjectViewMode) => void;
}

const VIEW_OPTIONS = [
  { value: "list" as const, label: "리스트 보기", icon: List },
  { value: "grid" as const, label: "갤러리 보기", icon: Grid2X2 },
];

export function ProjectViewToggle({ value, onChange }: ProjectViewToggleProps) {
  return (
    <div
      className="flex h-8 items-center rounded-full border border-gray-200 bg-white p-px"
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
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              selected ? "bg-blue-100 text-blue-500" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Icon size={17} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
