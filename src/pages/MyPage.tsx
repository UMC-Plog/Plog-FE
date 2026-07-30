import { useEffect, useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchProfile, logoutRequest } from "../api/auth";
import { ApiError } from "../api/client";
import { AVATAR_PRESETS } from "../components/AvatarPicker";
import { AlertModal } from "../components/Modal";
import { getPersistentProfileImage } from "../lib/profileImage";
import { toAvatarId } from "../lib/profilePreset";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/authStore";

export function PlogMark() {
  return (
    <svg width="24" height="24" viewBox="90 8 59 66" fill="none" aria-hidden="true">
      <path
        d="M118.221 9.10547C123.148 8.78656 125.009 10.7605 128.988 13.2605L135.151 17.0525L139.148 19.5511C140.878 20.6102 143.039 21.5472 143.557 23.7109C144.472 27.532 139.302 29.3804 136.837 30.8569L131.36 34.1163C130.126 34.8386 128.09 36.1478 126.734 36.4806C123.671 37.2327 121.101 36.898 118.391 35.3057C117.522 34.8809 116.652 34.1638 115.797 33.6888C112.73 31.9942 109.743 30.0236 106.727 28.2527C103.952 26.6229 102.827 28.4619 100.461 29.2982C98.5068 29.9887 96.8877 28.2348 95.2594 27.4412C93.7342 26.6979 92.6612 25.2361 93.6786 23.4948C94.6897 21.928 97.1879 20.966 98.7405 19.9804C99.7346 19.3493 100.688 18.7736 101.672 18.1628C102.478 17.6631 103.326 17.2273 104.136 16.7441L109.794 13.3743C112.543 11.7031 115.079 9.91358 118.221 9.10547ZM123.418 29.1026C126.04 29.212 126.784 28.2092 128.963 26.9312C129.833 26.4205 133.082 24.8843 131.099 23.2721C128.79 21.3945 125.721 19.9598 123.279 18.2399C121.998 17.3958 121.034 17.1061 119.529 17.1003C119.421 17.0998 119.313 17.1013 119.205 17.1047C118.758 17.1327 118.396 17.1973 117.977 17.3742C117.081 17.7524 111.858 20.7382 111.373 21.3101C111.24 21.4676 111.111 21.6785 111.134 21.8953C111.173 22.2551 111.438 22.5487 111.713 22.7521C112.638 23.4356 113.755 23.8777 114.734 24.4781L119.304 27.298C120.326 27.9162 122.172 29.1625 123.418 29.1026Z"
        fill="#126FFB"
      />
      <path
        d="M145.04 30.0174C145.34 29.9787 145.754 30.0231 146.038 30.1185C147.78 30.7362 147.486 32.2916 147.61 33.5845C147.944 37.0601 145.921 37.7181 143.346 39.1841C141.795 40.0669 139.962 41.2214 138.344 42.1747C134.603 44.3943 130.592 46.0741 129.132 50.6294C128.595 52.3026 128.639 54.2666 128.657 56.0195C128.674 57.5683 128.418 59.513 129.079 60.9042C129.381 61.0372 129.821 61.1455 130.147 61.237C131.059 60.9124 133.099 59.5793 134.075 58.9996L138.035 56.5955C139.414 55.7461 141.322 54.9122 141.443 53.017C141.478 52.4736 141.607 51.9768 141.257 51.5003C140.352 51.0167 138.459 53.0614 136.964 53.1382C136.614 53.1562 136.287 53.0772 136.024 52.8304C135.576 52.4096 135.464 51.7014 135.442 51.1096C135.388 49.7076 135.359 47.904 136.378 46.8201C137.032 46.125 143.266 42.4734 144.441 41.9653C144.797 41.8112 145.147 41.7084 145.536 41.7103C146.083 41.7127 146.586 41.9066 146.969 42.3098C147.2 42.5527 147.372 42.7991 147.458 43.1276C147.806 44.4499 147.6 48.1021 147.591 49.6377C147.618 53.1273 147.932 57.3054 145.788 60.2206C144.213 62.3632 140.526 64.0681 138.266 65.4551L132.974 68.6509C130.179 70.3677 126.173 73.6426 122.957 71.0473C120.676 69.2072 120.939 65.0327 120.932 62.3721C120.929 61.5288 120.927 60.6724 120.925 59.8265L120.926 54.7229C120.934 50.4489 121.059 47.1833 123.673 43.5402C125.523 40.9626 127.394 40.0753 129.984 38.5434L135.595 35.2288L140.998 31.9805C142.191 31.2704 143.692 30.2059 145.04 30.0174Z"
        fill="#173F8C"
      />
      <path
        d="M92.6138 29.8419C93.6172 29.818 95.0324 30.7644 95.8593 31.2892C97.3936 32.2628 98.4096 32.9297 98.7621 34.864C99.0448 36.4156 98.9646 37.7424 98.9458 39.3102C98.9231 41.5475 98.9139 43.785 98.9185 46.0224C98.9193 47.2368 98.891 49.3596 99.0547 50.5143C99.1774 51.3319 99.4142 52.1274 99.7579 52.8764C100.673 54.8549 102.022 55.24 103.735 56.2983L108.616 59.2598C109.312 59.6876 110.02 60.208 110.736 60.6178C112.593 61.6774 114.557 62.7168 116.24 64.0497C116.603 64.4276 117.442 65.604 117.454 66.1364C117.504 68.2747 118.3 70.8726 116.08 71.9757C112.776 72.847 108.658 69.2437 105.956 67.7787C104.544 67.0129 103.126 66.0286 101.746 65.18C100.06 64.1632 98.3822 63.1328 96.7121 62.089C95.6869 61.4623 94.7443 61.0264 93.8184 60.22C92.0038 58.6397 91.1366 56.8072 90.9512 54.3952C90.8335 52.8646 90.8725 51.3858 90.874 49.8558L90.8784 42.8278L90.8624 36.1476C90.8595 34.6574 90.8163 33.0964 90.9935 31.6179C91.0696 30.9836 91.296 30.6293 91.6802 30.1581C92.0126 30.0131 92.2698 29.9416 92.6138 29.8419Z"
        fill="#06BCC4"
      />
      <path
        d="M105.451 37.9983C107.593 37.7865 111.769 40.9615 113.622 42.1359C115.01 43.0155 116.398 45.9322 116.339 47.5988C116.246 50.1968 117.526 56.9455 113.652 57.3154C113.127 57.3248 112.514 57.345 112.019 57.109C109.898 56.0965 107.221 54.4223 105.282 53.1294C104.03 52.2941 102.787 49.8697 102.691 48.3691C102.563 45.7821 102.417 42.9434 102.781 40.3851C102.972 39.0496 104.202 38.155 105.451 37.9983Z"
        fill="#126FFB"
      />
    </svg>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const syncProfile = useAuthStore((state) => state.syncProfile);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const avatar = AVATAR_PRESETS.find((preset) => preset.id === user?.avatarId) ?? AVATAR_PRESETS[0];
  const avatarSrc = getPersistentProfileImage(user?.avatarImageUrl) ?? avatar.src;
  const displayRealName = user?.realName?.trim() || "이름 없음";
  const displayNickname = user?.nickname?.trim() || "닉네임 없음";
  const displayEmail = user?.email?.trim() || "이메일 없음";

  useEffect(() => {
    let active = true;

    void fetchProfile()
      .then((profile) => {
        if (!active) return;
        syncProfile({
          email: profile.email,
          realName: profile.name,
          nickname: profile.nickname,
          avatarId: toAvatarId(profile.profilePreset),
          avatarImageUrl: null,
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "사용자 정보를 불러오지 못했어요."
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [syncProfile]);

  return (
    <div className="min-h-full bg-gray-25">
      <header className="flex h-[58px] items-center gap-[18px] border-b border-gray-100 bg-gray-25 px-7 shadow-sm">
        <PlogMark />
        <h1 className="text-[18px] font-bold leading-[25px] text-gray-900">마이페이지</h1>
      </header>

      <div className="px-4 pt-7">
        {isLoading ? (
          <div
            className="flex h-[78px] items-center justify-center"
            role="status"
            aria-label="사용자 정보 불러오는 중"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/my/profile")}
            aria-label="프로필 수정"
            className="flex h-[78px] w-full items-center rounded-16 border border-gray-100 bg-white/10 px-4 text-left shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <img
              src={avatarSrc}
              alt={`${displayNickname} 프로필`}
              className="h-[60px] w-[60px] shrink-0 rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = avatar.src;
              }}
            />
            <span className="ml-4 min-w-0 flex-1">
              <strong className="block truncate text-[16px] font-normal leading-[22px] text-gray-900">
                {displayNickname}
              </strong>
              <span className="mt-0.5 block truncate text-[12px] font-normal leading-[17px] text-gray-400">
                {displayRealName} · {displayEmail}
              </span>
            </span>
            <ChevronRight size={20} strokeWidth={1.7} className="text-gray-400" aria-hidden="true" />
          </button>
        )}

        <section className="mt-[38px]" aria-labelledby="settings-title">
          <h2 id="settings-title" className="text-[18px] font-normal leading-[25px] text-gray-500">설정</h2>
          <div className="mt-2 rounded-16 border border-gray-100 bg-white/10 px-[18px] shadow-card">
            {[
              { label: "알림 설정", danger: false, onClick: () => navigate("/my/notifications") },
              { label: "로그아웃", danger: false, onClick: () => setLogoutOpen(true) },
              { label: "회원 탈퇴", danger: true, onClick: () => navigate("/my/withdraw") },
            ].map((setting) => (
              <button
                type="button"
                key={setting.label}
                onClick={setting.onClick}
                className="flex h-[52.66px] w-full items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
              >
                <span className={cn("flex-1 text-[15px] font-normal leading-[21px]", setting.danger ? "text-error" : "text-gray-700")}>
                  {setting.label}
                </span>
                <ChevronRight size={20} strokeWidth={1.7} className="text-gray-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {logoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-5"
          onClick={() => setLogoutOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="h-[282px] w-full max-w-[360px] rounded-[22px] bg-white px-6 pb-6 pt-9 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <LogOut size={25} strokeWidth={2} className="rotate-180" aria-hidden="true" />
              </span>
              <h2 id="logout-dialog-title" className="mt-5 text-[18px] font-normal leading-[25px] text-gray-900">
                로그아웃 하시겠어요?
              </h2>
              <p className="mt-2 text-[13px] font-normal leading-[18px] text-gray-400">
                다시 로그인하면 모든 데이터는 유지돼요
              </p>
              <div className="mt-[38px] grid w-full grid-cols-2 gap-[10px]">
                <button
                  type="button"
                  onClick={() => setLogoutOpen(false)}
                  className="h-14 rounded-[14px] bg-gray-100 text-[16px] font-semibold text-gray-400"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const refreshToken = useAuthStore.getState().refreshToken;
                    if (refreshToken) {
                      await logoutRequest(refreshToken).catch(() => {});
                    }
                    logout();
                    navigate("/login", { replace: true });
                  }}
                  className="h-14 rounded-[14px] bg-error text-[16px] font-semibold text-white"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <AlertModal
        open={Boolean(loadError)}
        title={loadError ?? ""}
        onConfirm={() => setLoadError(null)}
      />
    </div>
  );
}
