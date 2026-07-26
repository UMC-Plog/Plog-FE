import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvatarPicker, type AvatarPresetId } from "../components/AvatarPicker";
import { ProgressBar } from "../components/ProgressBar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { mockCheckNickname } from "../mocks/nickname";
import { useAuthStore } from "../store/authStore";

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const completeSignup = useAuthStore((s) => s.completeSignup);
  const setSignupField = useAuthStore((s) => s.setSignupField);
  const signupMethod = useAuthStore((s) => s.signupDraft.method);
  const isSocialSignup = signupMethod === "kakao" || signupMethod === "google";

  const [avatarId, setAvatarId] = useState<AvatarPresetId | null>(null);
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const latestNicknameRef = useRef(nickname);
  const nicknameRequestRef = useRef(0);

  const normalizedNickname = nickname.trim();
  const nicknameValid = normalizedNickname.length >= 2 && normalizedNickname.length <= 6;

  const handleCheckNickname = async () => {
    const targetNickname = normalizedNickname;
    if (!nicknameValid || nicknameChecking) return;

    const requestId = ++nicknameRequestRef.current;
    setNicknameChecking(true);
    try {
      const available = await mockCheckNickname(targetNickname);
      if (
        requestId !== nicknameRequestRef.current ||
        latestNicknameRef.current.trim() !== targetNickname
      ) {
        return;
      }

      setNicknameAvailable(available);
      setCheckedNickname(targetNickname);
    } finally {
      if (requestId === nicknameRequestRef.current) {
        setNicknameChecking(false);
      }
    }
  };

  const normalizedRealName = realName.trim();
  const realNameValid = normalizedRealName.length > 0;

  const nicknameVerified =
    nicknameAvailable === true && checkedNickname === normalizedNickname;
  const canSubmit = nicknameVerified && (!isSocialSignup || realNameValid);

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (isSocialSignup) {
      setSignupField("realName", normalizedRealName);
    }
    setSignupField("avatarId", avatarId);
    setSignupField("avatarImageUrl", null);
    setSignupField("nickname", normalizedNickname);
    setSignupField("isNicknameAvailable", true);
    completeSignup();
    navigate("/home");
  };

  return (
    <div className="app-shell">
      <div className="px-5 pt-4">
        <ProgressBar total={2} current={2} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-6">
        <h1 className="text-h2 font-semibold text-gray-900">프로필 설정</h1>

        {isSocialSignup && (
          <div className="mt-6">
            <div className="mb-1.5 flex items-end gap-1">
              <label htmlFor="signup-real-name" className="text-body font-normal text-gray-900">
                실명
              </label>
              <span className="text-caption font-normal text-gray-400">
                *반드시 실명으로 설정하셔야 하며, 가입 후 1회만 변경가능합니다
              </span>
            </div>
            <Input
              id="signup-real-name"
              placeholder="홍길동"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6">
          <Input
            label="닉네임"
            placeholder="닉네임을 입력해 주세요"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              latestNicknameRef.current = e.target.value;
              nicknameRequestRef.current += 1;
              setNicknameChecking(false);
              setNicknameAvailable(null);
              setCheckedNickname(null);
            }}
            errorText={
              nickname.length > 0 && !nicknameValid
                ? "닉네임은 2~6자로 입력해 주세요"
                : nicknameAvailable === false && checkedNickname === normalizedNickname
                ? "사용 불가능한 닉네임이에요"
                : undefined
            }
            successText={nicknameVerified ? "사용 가능한 닉네임이에요" : undefined}
            suffix={
              <button
                type="button"
                onClick={handleCheckNickname}
                disabled={!nicknameValid || nicknameChecking}
                className="h-9 shrink-0 rounded-md bg-blue-500 px-3 text-body-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                {nicknameChecking ? "확인 중" : "중복 확인"}
              </button>
            }
          />
        </div>

        <div className="mt-6">
          <AvatarPicker size="lg" value={avatarId} onSelect={setAvatarId} />
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
