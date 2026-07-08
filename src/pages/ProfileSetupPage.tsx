import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvatarPicker, type AvatarPresetId } from "../components/AvatarPicker";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useAuthStore } from "../store/authStore";

// TODO: 실제 API 연동 시 서버 중복확인 엔드포인트로 교체
const TAKEN_NICKNAMES = ["무니", "곰곰", "포도"];

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const completeSignup = useAuthStore((s) => s.completeSignup);

  const [avatarId, setAvatarId] = useState<AvatarPresetId | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setCustomImageUrl(url);
    setAvatarId(null);
  };

  const handleCheckNickname = () => {
    if (!nickname.trim()) return;
    const available = !TAKEN_NICKNAMES.includes(nickname.trim());
    setNicknameAvailable(available);
    setCheckedNickname(nickname.trim());
  };

  const nicknameVerified = nicknameAvailable === true && checkedNickname === nickname.trim();
  const canSubmit = (avatarId !== null || customImageUrl !== null) && nicknameVerified;

  const handleSubmit = () => {
    if (!canSubmit) return;
    completeSignup();
    navigate("/home");
  };

  return (
    <div className="app-shell">
      <div className="px-5 pt-4">
        <ProgressBar total={2} current={2} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-6">
        <h1 className="text-h2 font-extrabold text-gray-900">프로필 설정</h1>

        <div className="mt-6">
          <AvatarPicker
            value={avatarId}
            customImageUrl={customImageUrl}
            onSelect={(id) => {
              setAvatarId(id);
              setCustomImageUrl(null);
            }}
            onUpload={handleUpload}
          />
        </div>

        <div className="mt-6">
          <Input
            label="닉네임"
            placeholder="닉네임을 입력해 주세요"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameAvailable(null);
            }}
            errorText={
              nicknameAvailable === false && checkedNickname === nickname.trim()
                ? "사용 불가능한 닉네임이에요"
                : undefined
            }
            successText={nicknameVerified ? "사용 가능한 닉네임이에요" : undefined}
            suffix={
              <button
                type="button"
                onClick={handleCheckNickname}
                disabled={!nickname.trim()}
                className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                중복 확인
              </button>
            }
          />
        </div>

        <div className="mt-auto pb-8 pt-8">
          <Button size="lg" disabled={!canSubmit} onClick={handleSubmit}>
            시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
