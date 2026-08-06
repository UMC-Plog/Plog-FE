import { cn } from "../lib/utils";

interface NotificationDotProps {
  show: boolean;
  className?: string;
}

/** 아이콘 우측 상단 모서리에 붙는 안 읽음 표시 점. 부모를 `relative inline-flex`로 감싼 뒤 아이콘과 함께 넣어 쓴다. */
export function NotificationDot({ show, className }: NotificationDotProps) {
  if (!show) return null;

  return (
    <span
      aria-hidden="true"
      className={cn("absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-error", className)}
    />
  );
}
