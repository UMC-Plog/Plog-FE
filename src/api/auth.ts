import { apiRequest } from "./client";
import type { ProfilePreset } from "../lib/profilePreset";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ProfileResponse {
  email: string;
  name: string;
  nickname: string;
  profilePreset: ProfilePreset | null;
  nameChangeAvailable: boolean;
}

export interface ProfileUpdateRequest {
  name?: string;
  nickname?: string;
  preset?: ProfilePreset;
}

export type AgreementType = "SERVICE_TERMS" | "PRIVACY" | "EXTERNAL_DATA" | "MARKETING";

export interface AgreementItem {
  agreementType: AgreementType;
  agreed: boolean;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  nickname: string;
  profilePreset: ProfilePreset | null;
  agreements: AgreementItem[];
}

export function sendEmailVerificationCode(email: string) {
  return apiRequest<void>("/api/auth/email/send", { method: "POST", body: { email } });
}

export function verifyEmailCode(email: string, code: string) {
  return apiRequest<void>("/api/auth/email/verify", { method: "POST", body: { email, code } });
}

export function checkNicknameAvailable(nickname: string) {
  return apiRequest<void>(`/api/auth/nickname/check?nickname=${encodeURIComponent(nickname)}`);
}

export function signup(payload: SignupRequest) {
  return apiRequest<void>("/api/auth/signup", { method: "POST", body: payload });
}

export function login(email: string, password: string) {
  return apiRequest<TokenResponse>("/api/auth/login", { method: "POST", body: { email, password } });
}

export function fetchProfile(accessToken?: string) {
  return apiRequest<ProfileResponse>("/api/profile", { accessToken });
}

export function updateProfile(payload: ProfileUpdateRequest) {
  return apiRequest<void>("/api/profile", { method: "PATCH", body: payload });
}

export function checkProfileNicknameAvailable(nickname: string) {
  return apiRequest<void>(
    `/api/profile/nickname/check?nickname=${encodeURIComponent(nickname)}`
  );
}

export function sendPasswordResetCode(email: string) {
  return apiRequest<void>("/api/auth/password/email/send", { method: "POST", body: { email } });
}

export function verifyPasswordResetCode(email: string, code: string) {
  return apiRequest<void>("/api/auth/password/email/verify", { method: "POST", body: { email, code } });
}

export function resetPassword(email: string, newPassword: string, newPasswordConfirm: string) {
  return apiRequest<void>("/api/auth/password/reset", {
    method: "POST",
    body: { email, newPassword, newPasswordConfirm },
  });
}

export function logoutRequest(refreshToken: string) {
  return apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken } });
}

export interface SocialLoginResponse {
  status: "LOGIN" | "SIGNUP_REQUIRED";
  accessToken: string | null;
  refreshToken: string | null;
  ticket: string | null;
  email: string | null;
}

export interface SocialSignupRequest {
  ticket: string;
  name: string;
  nickname: string;
  profilePreset: ProfilePreset | null;
  agreements: AgreementItem[];
}

export function oauthLogin(provider: "kakao" | "google", code: string) {
  return apiRequest<SocialLoginResponse>(`/api/auth/oauth/${provider}`, {
    method: "POST",
    body: { code },
  });
}

export function oauthSignup(payload: SocialSignupRequest) {
  return apiRequest<TokenResponse>("/api/auth/oauth/signup", { method: "POST", body: payload });
}
