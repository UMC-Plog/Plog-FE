import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** 빈 상태 화면 (예: "아직 프로젝트가 없어요") */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-title font-bold text-gray-700">{title}</p>
      {description && <p className="mt-1.5 text-body-sm text-gray-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
