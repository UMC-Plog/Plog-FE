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
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
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
