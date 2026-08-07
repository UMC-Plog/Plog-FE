import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvatarPresetId } from "../components/AvatarPicker";
import { getPersistentProfileImage } from "../lib/profileImage";

export type SocialProvider = "google" | "kakao";

export interface AuthUser {
  id: string;
  email: string;
  realName: string;
  nickname: string;
  avatarId: AvatarPresetId | null;
  avatarImageUrl: string | null;
}

export interface ProfileUpdate {
  nickname: string;
  avatarId: AvatarPresetId | null;
  avatarImageUrl: string | null;
}

export type SyncedProfile = Omit<AuthUser, "id">;

interface TermsAgreement {
  service: boolean; // [필수] 서비스 이용약관
  privacy: boolean; // [필수] 개인정보 수집 및 이용
  externalTool: boolean; // [필수] 외부 협업 툴 데이터 접근
  marketing: boolean; // [선택] 마케팅 정보 수신
}

interface SignupDraft {
  method: SocialProvider | "email" | null;
  terms: TermsAgreement;
  realName: string;
  email: string;
  isEmailVerified: boolean;
  password: string;
  avatarId: AvatarPresetId | null;
  avatarImageUrl: string | null;
  nickname: string;
  isNicknameAvailable: boolean;
  ticket: string | null;
}

const emptyTerms: TermsAgreement = {
  service: false,
  privacy: false,
  externalTool: false,
  marketing: false,
};

const emptySignupDraft: SignupDraft = {
  method: null,
  terms: emptyTerms,
  realName: "",
  email: "",
  isEmailVerified: false,
  password: "",
  avatarId: null,
  avatarImageUrl: null,
  nickname: "",
  ticket: null,
  isNicknameAvailable: false,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  signupDraft: SignupDraft;

  // auth actions
  login: (user: AuthUser, tokens?: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  updateProfile: (profile: ProfileUpdate) => void;
  syncProfile: (profile: SyncedProfile) => void;

  // signup draft actions (다단계 진행 중 데이터 유지)
  setSignupMethod: (method: SignupDraft["method"]) => void;
  setTerms: (terms: Partial<TermsAgreement>) => void;
  setSignupField: <K extends keyof SignupDraft>(key: K, value: SignupDraft[K]) => void;
  resetSignupDraft: () => void;
  completeSignup: (tokens?: AuthTokens) => AuthUser;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      signupDraft: emptySignupDraft,

      login: (user, tokens) =>
        set({
          user,
          ...(tokens ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } : {}),
        }),
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        // 로그아웃/계정 전환 시 이전 계정의 안 읽음 배지 상태가 남지 않도록 알린다.
        window.dispatchEvent(new CustomEvent("plog:logout"));
      },
      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      updateProfile: (profile) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                nickname: profile.nickname.trim(),
                avatarId: profile.avatarId,
                avatarImageUrl: getPersistentProfileImage(profile.avatarImageUrl),
              }
            : null,
        })),
      syncProfile: (profile) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...profile,
                nickname: profile.nickname.trim(),
                realName: profile.realName.trim(),
                avatarImageUrl: getPersistentProfileImage(profile.avatarImageUrl),
              }
            : null,
        })),

      setSignupMethod: (method) =>
        set((state) => ({ signupDraft: { ...state.signupDraft, method } })),

      setTerms: (terms) =>
        set((state) => ({
          signupDraft: { ...state.signupDraft, terms: { ...state.signupDraft.terms, ...terms } },
        })),

      setSignupField: (key, value) =>
        set((state) => ({ signupDraft: { ...state.signupDraft, [key]: value } })),

      resetSignupDraft: () => set({ signupDraft: emptySignupDraft }),

      completeSignup: (tokens) => {
        const draft = get().signupDraft;
        const newUser: AuthUser = {
          id: crypto.randomUUID(),
          email: draft.email,
          realName: draft.realName.trim(),
          nickname: draft.nickname.trim(),
          avatarId: draft.avatarId,
          avatarImageUrl: getPersistentProfileImage(draft.avatarImageUrl),
        };
        set({
          user: newUser,
          ...(tokens ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } : {}),
        });
        get().resetSignupDraft();
        return newUser;
      },
    }),
    {
      name: "plog-auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }), // signupDraft는 새로고침 시 굳이 유지 안 함
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AuthState>;
        const persistedUser = persisted.user;

        return {
          ...currentState,
          ...persisted,
          user: persistedUser
            ? {
                ...persistedUser,
                avatarImageUrl: getPersistentProfileImage(persistedUser.avatarImageUrl),
              }
            : null,
        };
      },
    }
  )
);

// zustand persist는 탭이 열릴 때 딱 한 번만 localStorage를 읽어온다. 다른 탭에서 로그인/토큰
// 재발급/로그아웃이 일어나도 이 탭의 메모리 상태는 자동으로 갱신되지 않는데, refreshToken은
// 재발급마다 회전(rotate)되므로 오래된 탭이 낡은 refreshToken으로 재발급을 시도하면 실패해서
// 로그아웃되고, 그 로그아웃이 localStorage까지 지워버려 다른 탭의 정상 세션까지 함께 끊어진다.
// 다른 탭에서 저장소가 바뀔 때마다 이 탭도 즉시 재하이드레이션해서 항상 최신 토큰을 쓰도록 한다.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "plog-auth-storage") {
      void useAuthStore.persist.rehydrate();
    }
  });
}
