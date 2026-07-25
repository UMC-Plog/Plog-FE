import { useRef, useState, type FormEvent } from "react";
import { Check, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AVATAR_PRESETS,
  AvatarPicker,
  type AvatarPresetId,
} from "../../components/AvatarPicker";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Layout } from "../../components/Layout";
import { AlertModal, BottomSheet } from "../../components/Modal";
import { getPersistentProfileImage } from "../../lib/profileImage";
import { mockCheckNickname } from "../../mocks/nickname";
import { useAuthStore } from "../../store/authStore";

type NicknameCheckState = "idle" | "checking" | "available" | "duplicate";

export function ProfileEditPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const originalNickname = user?.nickname ?? "";
  const initialCustomImageUrl = getPersistentProfileImage(user?.avatarImageUrl);
  const initialAvatarId = user?.avatarId ?? (initialCustomImageUrl ? null : "otter");

  const [nickname, setNickname] = useState(originalNickname);
  const [avatarId, setAvatarId] = useState<AvatarPresetId | null>(initialAvatarId);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(initialCustomImageUrl);
  const [stagedAvatarId, setStagedAvatarId] = useState<AvatarPresetId | null>(initialAvatarId);
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(initialCustomImageUrl);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageReading, setImageReading] = useState(false);
  const [checkState, setCheckState] = useState<NicknameCheckState>("idle");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const latestNicknameRef = useRef(nickname);
  const imageRequestRef = useRef(0);
  const saveStartedRef = useRef(false);

  const normalizedNickname = nickname.trim();
  const nicknameValid = normalizedNickname.length >= 2 && normalizedNickname.length <= 6;
  const nicknameUnchanged = normalizedNickname === originalNickname;
  const nicknameChecked =
    checkState === "available" && checkedNickname === normalizedNickname;
  const avatarSelected = avatarId !== null || customImageUrl !== null;
  const hasChanges =
    normalizedNickname !== originalNickname ||
    avatarId !== initialAvatarId ||
    customImageUrl !== initialCustomImageUrl;
  const canSave =
    user !== null &&
    hasChanges &&
    nicknameValid &&
    (nicknameUnchanged || nicknameChecked) &&
    avatarSelected &&
    !imageReading &&
    !saving;

  const nicknameError = !nicknameValid
    ? normalizedNickname.length === 0
      ? "닉네임을 입력해 주세요"
      : "닉네임은 2~6자로 입력해 주세요"
    : checkState === "duplicate" && checkedNickname === normalizedNickname
    ? "사용 불가능한 닉네임이에요"
    : undefined;

  const nicknameSuccess = nicknameChecked ? "사용 가능한 닉네임이에요" : undefined;
  const avatarPreset = AVATAR_PRESETS.find((preset) => preset.id === avatarId) ?? AVATAR_PRESETS[0];
  const avatarSrc = customImageUrl ?? avatarPreset.src;

  const handleNicknameChange = (value: string) => {
    latestNicknameRef.current = value;
    setNickname(value);
    setCheckState("idle");
    setCheckedNickname(null);
  };

  const handleCheckNickname = async () => {
    const targetNickname = normalizedNickname;
    if (
      !nicknameValid ||
      nicknameUnchanged ||
      checkState === "checking" ||
      checkedNickname === targetNickname
    ) {
      return;
    }

    setCheckState("checking");
    const available = await mockCheckNickname(targetNickname);
    if (latestNicknameRef.current.trim() !== targetNickname) return;

    setCheckedNickname(targetNickname);
    setCheckState(available ? "available" : "duplicate");
  };

  const openAvatarSheet = () => {
    setStagedAvatarId(avatarId);
    setStagedImageUrl(customImageUrl);
    setAvatarSheetOpen(true);
  };

  const closeAvatarSheet = () => {
    imageRequestRef.current += 1;
    setStagedAvatarId(avatarId);
    setStagedImageUrl(customImageUrl);
    setImageError("");
    setImageReading(false);
    setAvatarSheetOpen(false);
  };

  const applyAvatar = () => {
    setAvatarId(stagedAvatarId);
    setCustomImageUrl(stagedImageUrl);
    setAvatarSheetOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || saveStartedRef.current) return;

    saveStartedRef.current = true;
    setSaving(true);
    updateProfile({
      nickname: normalizedNickname,
      avatarId,
      avatarImageUrl: customImageUrl,
    });
    setSaving(false);
    setSavedOpen(true);
  };

  return (
    <Layout className="bg-gray-25">
      <AuthHeader
        title="프로필 수정"
        variant="inline"
        onBack={() => navigate("/my")}
      />

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit} noValidate>
        <div className="px-5 pt-8">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={avatarSrc}
                alt={`${user?.nickname ?? "사용자"} 프로필`}
                className="h-28 w-28 rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = avatarPreset.src;
                }}
              />
              <button
                type="button"
                onClick={openAvatarSheet}
                aria-label="프로필 이미지 변경"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white"
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-10 space-y-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label htmlFor="profile-real-name" className="text-body-sm font-medium text-gray-700">
                  실명
                </label>
                <span className="text-caption font-normal text-gray-400">
                  * 분석 리포트의 신뢰도를 위해 가입 후 1회만 변경 가능합니다
                </span>
              </div>
              <Input
                id="profile-real-name"
                value={user?.realName ?? ""}
                locked
                className="h-14 rounded-lg bg-white text-gray-900 disabled:text-gray-900"
                suffix={
                  <Button type="button" size="sm" fullWidth={false} disabled className="h-10 px-4">
                    변경
                  </Button>
                }
              />
            </div>

            <Input
              id="profile-nickname"
              label="닉네임 변경"
              value={nickname}
              onChange={(event) => handleNicknameChange(event.target.value)}
              errorText={nicknameError}
              successText={nicknameSuccess}
              className="h-14 rounded-lg"
              suffix={
                <Button
                  type="button"
                  size="sm"
                  fullWidth={false}
                  loading={checkState === "checking"}
                  disabled={
                    !nicknameValid ||
                    nicknameUnchanged ||
                    checkState === "checking" ||
                    checkedNickname === normalizedNickname
                  }
                  onClick={handleCheckNickname}
                  className="h-10 px-4 enabled:!text-white disabled:!text-gray-400"
                >
                  중복 확인
                </Button>
              }
            />
          </div>
        </div>

        <footer className="mt-auto border-t border-gray-100 bg-white px-5 pb-8 pt-4">
          <Button
            type="submit"
            size="lg"
            loading={saving}
            disabled={!canSave}
            className="enabled:!text-white disabled:!text-gray-400"
          >
            저장
          </Button>
        </footer>
      </form>

      <BottomSheet open={avatarSheetOpen} onClose={closeAvatarSheet}>
        <h2 className="text-h3 font-bold text-gray-900">프로필 이미지 변경</h2>
        <div className="mt-6">
          <AvatarPicker
            value={stagedAvatarId}
            customImageUrl={stagedImageUrl}
            onSelect={(nextAvatarId) => {
              setStagedAvatarId(nextAvatarId);
              setStagedImageUrl(null);
              setImageError("");
            }}
            showLabel={false}
            size="lg"
          />
          <p className="mt-2 min-h-5 text-body-sm text-error" aria-live="polite">
            {imageError}
          </p>
        </div>
        <div className="mt-8">
          <Button
            type="button"
            size="lg"
            onClick={applyAvatar}
            loading={imageReading}
            disabled={(!stagedAvatarId && !stagedImageUrl) || imageReading}
            className="enabled:!text-white disabled:!text-gray-400"
          >
            변경
          </Button>
        </div>
      </BottomSheet>

      <AlertModal
        open={savedOpen}
        icon={
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-500">
            <Check size={24} strokeWidth={2.5} aria-hidden="true" />
          </span>
        }
        title="변경 사항이 저장되었습니다"
        confirmText="확인"
        onConfirm={() => navigate("/my")}
      />
    </Layout>
  );
}
