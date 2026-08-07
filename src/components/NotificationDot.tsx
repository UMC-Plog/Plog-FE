import { cn } from "../lib/utils";

interface NotificationDotProps {
  show: boolean;
  /** 점이 놓이는 배경 톤에 맞춘 테두리색. Figma 실측: 흰 배경 위엔 흰 테두리, Gray/25 배경 위엔 Gray/25 테두리. */
  ring?: "white" | "gray-25";
  className?: string;
}

/** 아이콘 우측 상단 모서리에 붙는 안 읽음 표시 점(8px). 부모를 `relative inline-flex`로 감싼 뒤 아이콘과 함께 넣어 쓴다. */
export function NotificationDot({ show, ring = "white", className }: NotificationDotProps) {
  if (!show) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-error",
        ring === "white" ? "border border-white" : "border border-gray-25",
        className
      )}
    />
  );
}
