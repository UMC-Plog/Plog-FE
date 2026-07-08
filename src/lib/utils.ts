import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx + tailwind-merge: 조건부 클래스 결합 + 충돌 클래스 정리 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
