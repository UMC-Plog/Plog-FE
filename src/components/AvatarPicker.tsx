import { useRef } from "react";
import { cn } from "../lib/utils";

export const AVATAR_PRESETS = [
  { id: "otter", emoji: "🦦", bg: "bg-gray-200" },
  { id: "penguin", emoji: "🐧", bg: "bg-blue-200" },
  { id: "frog", emoji: "🐸", bg: "bg-green-200" },
  { id: "koala", emoji: "🐨", bg: "bg-aqua-200" },
  { id: "panda", emoji: "🐼", bg: "bg-aqua-100" },
  { id: "smile", emoji: "😊", bg: "bg-yellow-200" },
  { id: "ghost", emoji: "👻", bg: "bg-purple-200" },
  { id: "tiger", emoji: "🐯", bg: "bg-orange-200" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

interface AvatarPickerProps {
  value: AvatarPresetId | null;
  customImageUrl?: string | null;
  onSelect: (id: AvatarPresetId) => void;
  onUpload?: (file: File) => void;
}

export function AvatarPicker({
  value,
  customImageUrl,
  onSelect,
  onUpload,
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = AVATAR_PRESETS.find((a) => a.id === value);

  return (
    <div className="w-full">
      <p className="mb-3 text-body-sm font-medium text-gray-700">프로필 선택</p>

      {/* 대표 미리보기 */}
      <div className="mb-5 flex justify-center">
        <div className="relative">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-5xl",
              customImageUrl ? "" : selected ? selected.bg : "bg-gray-100"
            )}
          >
            {customImageUrl ? (
              <img
                src={customImageUrl}
                alt="프로필 미리보기"
                className="h-full w-full object-cover"
              />
            ) : selected ? (
              selected.emoji
            ) : (
              <span className="text-gray-300 text-4xl">👤</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="프로필 이미지 업로드"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gray-500 text-white ring-2 ring-white"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload?.(file);
            }}
          />
        </div>
      </div>

      {/* 프리셋 그리드 */}
      <div className="grid grid-cols-4 gap-3">
        {AVATAR_PRESETS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-pressed={value === avatar.id}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all",
              avatar.bg,
              value === avatar.id
                ? "ring-2 ring-blue-500 ring-offset-2"
                : "hover:ring-2 hover:ring-gray-200 hover:ring-offset-2"
            )}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
