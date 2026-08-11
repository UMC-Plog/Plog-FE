import type { Project } from "../types/project";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateAfterDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function getDaysFromToday(date: string) {
  return Math.round((parseDateOnly(date) - parseDateOnly(toDateInputValue(new Date()))) / DAY_IN_MS);
}

// isFutureDate는 Peer 평가 개방 여부를 종료일로 직접 판정하는 데만 쓰였다.
// 서버가 evaluationAvailable로 내려주는 값을 쓰기로 하면서 호출부가 없어졌고,
// 같은 규칙을 프론트에서 다시 계산하는 일이 반복되지 않도록 함수째 지웠다.

export function getProjectDeadline(project: Project) {
  const days = getDaysFromToday(project.expectedEndDate);

  if (days === 0) {
    return {
      label: "D-DAY",
      tone: "success" as const,
    };
  }

  const label = days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;

  return {
    label,
    tone: days <= 7 ? ("urgent" as const) : ("default" as const),
  };
}
