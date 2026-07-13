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

export function isFutureDate(date: string) {
  return Boolean(date) && getDaysFromToday(date) > 0;
}

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
