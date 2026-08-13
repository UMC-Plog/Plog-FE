import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  checkProfileNicknameAvailable,
  fetchProfile,
  updateProfile as updateProfileRequest,
  type ProfileResponse,
} from "../../api/auth";
import { ApiError } from "../../api/client";
import {
  AVATAR_PRESETS,
  AvatarPicker,
  type AvatarPresetId,
} from "../../components/AvatarPicker";
import { AuthHeader } from "../../components/AuthHeader";
import { Button } from "../../components/Button";
import { DefaultAvatar } from "../../components/DefaultAvatar";
import { Input } from "../../components/Input";
import { Layout } from "../../components/Layout";
import { AlertModal, BottomSheet } from "../../components/Modal";
import { getPersistentProfileImage } from "../../lib/profileImage";
import { toAvatarId, toProfilePreset } from "../../lib/profilePreset";
import { useAuthStore } from "../../store/authStore";

type NicknameCheckState = "idle" | "checking" | "available" | "duplicate";

export function ProfileEditPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const syncProfile = useAuthStore((state) => state.syncProfile);
  const storedImageUrl = getPersistentProfileImage(user?.avatarImageUrl);
  const storedAvatarId = user?.avatarId ?? null;

  const [originalRealName, setOriginalRealName] = useState(user?.realName ?? "");
  const [realName, setRealName] = useState(user?.realName ?? "");
  const [nameChangeAvailable, setNameChangeAvailable] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [originalNickname, setOriginalNickname] = useState(user?.nickname ?? "");
  const [initialAvatarId, setInitialAvatarId] = useState<AvatarPresetId | null>(storedAvatarId);
  const [initialCustomImageUrl, setInitialCustomImageUrl] = useState<string | null>(storedImageUrl);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [avatarId, setAvatarId] = useState<AvatarPresetId | null>(storedAvatarId);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(storedImageUrl);
  const [stagedAvatarId, setStagedAvatarId] = useState<AvatarPresetId | null>(storedAvatarId);
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(storedImageUrl);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageReading, setImageReading] = useState(false);
  const [checkState, setCheckState] = useState<NicknameCheckState>("idle");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const latestNicknameRef = useRef(nickname);
  const imageRequestRef = useRef(0);
  const saveStartedRef = useRef(false);

  const applyProfile = useCallback(
    (profile: ProfileResponse) => {
      const nextAvatarId = toAvatarId(profile.profilePreset);
      syncProfile({
        email: profile.email,
        realName: profile.name,
        nickname: profile.nickname,
        avatarId: nextAvatarId,
        avatarImageUrl: null,
      });
      setOriginalRealName(profile.name);
      setRealName(profile.name);
      setNameChangeAvailable(profile.nameChangeAvailable);
      setNameEditing(false);
      setOriginalNickname(profile.nickname);
      setInitialAvatarId(nextAvatarId);
      setInitialCustomImageUrl(null);
      setNickname(profile.nickname);
      setAvatarId(nextAvatarId);
      setCustomImageUrl(null);
      setStagedAvatarId(nextAvatarId);
      setStagedImageUrl(null);
      latestNicknameRef.current = profile.nickname;
      setCheckState("idle");
      setCheckedNickname(null);
    },
    [syncProfile]
  );

  useEffect(() => {
    let active = true;

    void fetchProfile()
      .then((profile) => {
        if (active) applyProfile(profile);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "프로필 정보를 불러오지 못했어요."
        );
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyProfile]);

  const normalizedRealName = realName.trim();
  const realNameValid = normalizedRealName.length > 0;
  const realNameUnchanged = normalizedRealName === originalRealName;
  const normalizedNickname = nickname.trim();
  const nicknameValid = normalizedNickname.length >= 2 && normalizedNickname.length <= 6;
  const nicknameUnchanged = normalizedNickname === originalNickname;
  const nicknameChecked =
    checkState === "available" && checkedNickname === normalizedNickname;
  const hasChanges =
    (!realNameUnchanged && nameChangeAvailable) ||
    normalizedNickname !== originalNickname ||
    avatarId !== initialAvatarId ||
    customImageUrl !== initialCustomImageUrl;
  const canSave =
    user !== null &&
    hasChanges &&
    realNameValid &&
    nicknameValid &&
    (nicknameUnchanged || nicknameChecked) &&
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
  const avatarPreset = AVATAR_PRESETS.find((preset) => preset.id === avatarId);
  const customAvatarSrc = avatarImageFailed ? null : customImageUrl;
  const avatarSrc = customAvatarSrc ?? avatarPreset?.src ?? null;

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
    try {
      await checkProfileNicknameAvailable(targetNickname);
      if (latestNicknameRef.current.trim() !== targetNickname) return;
      setCheckedNickname(targetNickname);
      setCheckState("available");
    } catch (error) {
      if (latestNicknameRef.current.trim() !== targetNickname) return;
      setCheckedNickname(targetNickname);
      if (error instanceof ApiError && error.code === "AUTH003") {
        setCheckState("duplicate");
        return;
      }
      setCheckState("idle");
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "닉네임 중복 확인에 실패했어요."
      );
    }
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || saveStartedRef.current) return;

    saveStartedRef.current = true;
    setSaving(true);
    setErrorMessage(null);
    try {
      await updateProfileRequest({
        ...(!realNameUnchanged && nameChangeAvailable
          ? { name: normalizedRealName }
          : {}),
        ...(normalizedNickname !== originalNickname
          ? { nickname: normalizedNickname }
          : {}),
        ...(avatarId !== initialAvatarId && avatarId
          ? { preset: toProfilePreset(avatarId) ?? undefined }
          : {}),
      });
      const latestProfile = await fetchProfile();
      applyProfile(latestProfile);
      setSavedOpen(true);
    } catch (error) {
      saveStartedRef.current = false;
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "프로필을 수정하지 못했어요."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout className="bg-gray-25">
      <AuthHeader
        title="프로필 수정"
        variant="inline"
        onBack={() => navigate("/my")}
      />

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit} noValidate>
        {profileLoading ? (
          <div
            className="flex flex-1 items-center justify-center"
            role="status"
            aria-label="프로필 정보 불러오는 중"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
          </div>
        ) : (
          <>
          <div className="px-[22px] pt-9">
          <div className="flex justify-center">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`${user?.nickname ?? "사용자"} 프로필`}
                  className="h-[116px] w-[116px] rounded-full object-cover"
                  onError={() => setAvatarImageFailed(true)}
                />
              ) : (
                <DefaultAvatar className="h-[116px] w-[116px]" />
              )}
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

          <div className="mt-[46px] space-y-[25px]">
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
                value={realName}
                onChange={(event) => setRealName(event.target.value)}
                locked={!nameChangeAvailable || !nameEditing}
                className="h-14 w-full rounded-lg bg-white text-gray-900 disabled:text-gray-900"
                suffix={
                  <Button
                    type="button"
                    size="sm"
                    fullWidth={false}
                    disabled={!nameChangeAvailable || nameEditing}
                    onClick={() => setNameEditing(true)}
                    className="h-10 px-4"
                  >
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
              className="h-14 w-full rounded-lg"
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

          <footer className="mt-auto border-t border-gray-100 bg-white px-[22px] pb-[37px] pt-4">
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
          </>
        )}
      </form>

      <BottomSheet
        open={avatarSheetOpen}
        onClose={closeAvatarSheet}
        ariaLabelledby="profile-image-sheet-title"
        draggable
        closeOnHandleClick
        initialHeight={554}
        minHeight={236}
        maxHeight={554}
        contentClassName="rounded-t-[26px] px-4 pb-[37px] pt-[14px] [&>button:first-child]:top-0"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <h2 id="profile-image-sheet-title" className="mx-1 mt-[10px] shrink-0 text-h3 font-bold text-gray-900">
            프로필 이미지 변경
          </h2>
          <div className="mt-5 min-h-0 flex-1 overflow-hidden px-1">
            <AvatarPicker
              value={stagedAvatarId}
              customImageUrl={stagedImageUrl}
              onSelect={(nextAvatarId) => {
                setStagedAvatarId(nextAvatarId);
                setStagedImageUrl(null);
                setImageError("");
              }}
              showLabel={false}
              size="profile-edit"
            />
            <p className="mt-2 min-h-5 text-body-sm text-error" aria-live="polite">
              {imageError}
            </p>
          </div>
          <div className="mx-1 shrink-0 bg-white pt-4">
          <Button
            type="button"
            size="lg"
            onClick={applyAvatar}
            loading={imageReading}
            disabled={(stagedAvatarId === avatarId && stagedImageUrl === customImageUrl) || imageReading}
            className="enabled:!text-white disabled:!text-gray-400"
          >
            변경
          </Button>
          </div>
        </div>
      </BottomSheet>

      <AlertModal
        open={savedOpen}
        icon={
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-blue-100 text-blue-500">
            <Check size={24} strokeWidth={2.5} aria-hidden="true" />
          </span>
        }
        title="변경 사항이 저장되었습니다"
        confirmText="확인"
        onConfirm={() => navigate("/my")}
        variant="profile-saved"
      />
      <AlertModal
        open={Boolean(errorMessage)}
        title={errorMessage ?? ""}
        onConfirm={() => setErrorMessage(null)}
      />
    </Layout>
  );
}
