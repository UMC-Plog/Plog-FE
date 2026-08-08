import { User } from "lucide-react";
import { cn } from "../lib/utils";

interface DefaultAvatarProps {
  className?: string;
}

/**
 * profilePreset이 null(아바타 프리셋을 고르지 않음)일 때 보여주는 기본 아바타.
 * AvatarPicker의 "선택 안 됨" 미리보기와 같은 디자인(Blue/100 배경 + 흰색 사람 아이콘)을
 * 프로필을 실제로 보여주는 화면(MyPage 등)에서도 재사용하기 위한 공용 컴포넌트.
 */
export function DefaultAvatar({ className }: DefaultAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100",
        className
      )}
    >
      <User className="h-1/2 w-1/2 text-gray-25" strokeWidth={1.5} fill="currentColor" aria-hidden />
    </span>
  );
}
