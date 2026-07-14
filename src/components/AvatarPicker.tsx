import { useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "../lib/utils";
import otterImg from "../assets/수달.png";
import penguinImg from "../assets/펭귄.png";
import frogImg from "../assets/개구리.png";
import koalaImg from "../assets/코알라.png";
import pandaImg from "../assets/판다.png";
import smileImg from "../assets/스마일.png";
import ghostImg from "../assets/고스트.png";
import tigerImg from "../assets/호랑이.png";

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
  onUpload?: (file: File) => void;
  showLabel?: boolean;
  size?: "md" | "lg";
}

export function AvatarPicker({
  value,
  customImageUrl,
  onSelect,
  onUpload,
  showLabel = true,
  size = "md",
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = AVATAR_PRESETS.find((a) => a.id === value);

  return (
    <div className="w-full">
      {showLabel && <p className="mb-3 text-body-sm font-medium text-gray-700">프로필 선택</p>}

      {/* 대표 미리보기 */}
      <div className="mb-5 flex justify-center">
        <div className="relative">
          <div
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full",
              size === "lg" ? "h-28 w-28" : "h-24 w-24",
              customImageUrl || selected ? "" : "bg-gray-100"
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
              <span className="text-gray-300 text-4xl">👤</span>
            )}
          </div>
          {onUpload && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="프로필 이미지 업로드"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white"
              >
                <Camera size={16} aria-hidden="true" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* 프리셋 그리드 */}
      <div className="grid grid-cols-4 justify-items-center gap-3">
        {AVATAR_PRESETS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-pressed={value === avatar.id}
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full transition-all",
              size === "lg" ? "h-16 w-16" : "h-14 w-14",
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
