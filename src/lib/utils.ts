import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind.config.js의 커스텀 폰트 사이즈(text-title, text-h2 등)를
 * font-size 그룹으로 등록하지 않으면, twMerge가 이걸 text color 클래스와
 * 같은 그룹으로 오인해서 앞에 있던 text-white/text-blue-500 같은 색상
 * 클래스를 지워버림 (예: "text-white ... text-title" -> "text-title"만 남음)
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-title",
        "text-body",
        "text-body-sm",
        "text-caption",
      ],
    },
  },
});

/** clsx + tailwind-merge: 조건부 클래스 결합 + 충돌 클래스 정리 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
