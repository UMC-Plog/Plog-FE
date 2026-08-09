import defaultProfileIcon from "../assets/default-profile.png";
import { cn } from "../lib/utils";

interface DefaultAvatarProps {
  className?: string;
}

/**
 * profilePreset이 null(아바타 프리셋을 고르지 않음)일 때 보여주는 기본 아바타.
 * AvatarPicker의 "선택 안 됨" 미리보기와 같은 이미지를 프로필을 실제로 보여주는
 * 화면(MyPage 등)에서도 재사용하기 위한 공용 컴포넌트.
 */
export function DefaultAvatar({ className }: DefaultAvatarProps) {
  return (
    <img
      src={defaultProfileIcon}
      alt="기본 프로필"
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
