interface ProgressBarProps {
  /** 전체 단계 수 */
  total: number;
  /** 현재 단계 (1-indexed) */
  current: number;
}

/**
 * 회원가입/비밀번호 재설정 등 다단계 플로우 상단 진행률 바
 * Plog 그라디언트(Blue → Aqua) 적용
 */
export function ProgressBar({ total, current }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${percent}%`,
          background: "linear-gradient(95deg, #2186FB 0%, #06BCC4 100%)",
        }}
      />
    </div>
  );
}
