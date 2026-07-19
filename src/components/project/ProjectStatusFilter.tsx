import { cn } from "../../lib/utils";
import type { ProjectStatus } from "../../types/project";

export type ProjectStatusFilterValue = "ALL" | ProjectStatus;

interface ProjectStatusFilterProps {
  value: ProjectStatusFilterValue;
  onChange: (value: ProjectStatusFilterValue) => void;
}

const FILTERS: Array<{ value: ProjectStatusFilterValue; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETED", label: "완료" },
];

export function ProjectStatusFilter({ value, onChange }: ProjectStatusFilterProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="프로젝트 상태 필터">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "h-8 rounded-full border px-4 text-body-sm font-medium transition-colors",
            value === filter.value
              ? "border-blue-100 bg-blue-100 text-blue-500"
              : "border-gray-200 bg-gray-25 text-gray-400 hover:bg-gray-50"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
