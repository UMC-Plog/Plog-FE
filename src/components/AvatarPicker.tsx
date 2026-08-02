import { User } from "lucide-react";
import { cn } from "../lib/utils";
import otterImg from "../assets/otter.png";
import penguinImg from "../assets/penguin.png";
import frogImg from "../assets/frog.png";
import koalaImg from "../assets/koala.png";
import pandaImg from "../assets/panda.png";
import smileImg from "../assets/smile.png";
import ghostImg from "../assets/ghost.png";
import tigerImg from "../assets/tiger.png";

export const AVATAR_PRESETS = [
  { id: "otter", label: "수달", src: otterImg },
  { id: "penguin", label: "펭귄", src: penguinImg },
  { id: "frog", label: "개구리", src: frogImg },
  { id: "koala", label: "코알라", src: koalaImg },
  { id: "panda", label: "판다", src: pandaImg },
  { id: "smile", label: "스마일", src: smileImg },
  { id: "ghost", label: "고스트", src: ghostImg },
  { id: "tiger", label: "호랑이", src: tigerImg },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

interface AvatarPickerProps {
  value: AvatarPresetId | null;
  customImageUrl?: string | null;
  onSelect: (id: AvatarPresetId) => void;
  showLabel?: boolean;
  size?: "md" | "lg" | "profile-edit";
}

export function AvatarPicker({
  value,
  customImageUrl,
  onSelect,
  showLabel = true,
  size = "md",
}: AvatarPickerProps) {
  const selected = AVATAR_PRESETS.find((a) => a.id === value);

  return (
    <div className="w-full">
      {showLabel && <p className="mb-3 text-body font-normal text-gray-900">프로필 선택</p>}

      {/* 대표 미리보기 */}
      <div
        className={cn(
          "flex justify-center",
          size === "profile-edit" ? "mb-8" : "mb-5"
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full",
              size === "profile-edit"
                ? "h-[116px] w-[116px]"
                : size === "lg"
                  ? "h-28 w-28"
                  : "h-24 w-24",
              customImageUrl || selected ? "" : "bg-blue-100"
            )}
          >
            {customImageUrl ? (
              <img
                src={customImageUrl}
                alt="프로필 미리보기"
                className="h-full w-full object-cover"
              />
            ) : selected ? (
              <img
                src={selected.src}
                alt={selected.label}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-1/2 w-1/2 text-gray-25" strokeWidth={1.5} fill="currentColor" aria-hidden />
            )}
          </div>
        </div>
      </div>

      {/* 프리셋 그리드 */}
      <div
        className={cn(
          "grid grid-cols-4 justify-items-center",
          size === "profile-edit" ? "gap-x-[22px] gap-y-4" : "gap-3"
        )}
      >
        {AVATAR_PRESETS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-pressed={value === avatar.id}
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full transition-all",
              size === "profile-edit"
                ? "h-[72px] w-[72px]"
                : size === "lg"
                  ? "h-16 w-16"
                  : "h-14 w-14",
              value === avatar.id
                ? "ring-2 ring-blue-500 ring-offset-2"
                : "hover:ring-2 hover:ring-gray-200 hover:ring-offset-2"
            )}
          >
            <img src={avatar.src} alt={avatar.label} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
