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
  profilePreset: string | null;
  nameChangeAvailable: boolean;
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

export function fetchProfile(accessToken: string) {
  return apiRequest<ProfileResponse>("/api/profile", { accessToken });
}
