import type { AvatarPresetId } from "../components/AvatarPicker";

export type ProfilePreset =
  | "OTTER"
  | "PENGUIN"
  | "FROG"
  | "KOALA"
  | "PANDA"
  | "SMILEY"
  | "GHOST"
  | "TIGER";

const AVATAR_ID_TO_PROFILE_PRESET: Record<AvatarPresetId, ProfilePreset> = {
  otter: "OTTER",
  penguin: "PENGUIN",
  frog: "FROG",
  koala: "KOALA",
  panda: "PANDA",
  smile: "SMILEY",
  ghost: "GHOST",
  tiger: "TIGER",
};

const PROFILE_PRESET_TO_AVATAR_ID: Record<ProfilePreset, AvatarPresetId> = {
  OTTER: "otter",
  PENGUIN: "penguin",
  FROG: "frog",
  KOALA: "koala",
  PANDA: "panda",
  SMILEY: "smile",
  GHOST: "ghost",
  TIGER: "tiger",
};

export function toProfilePreset(avatarId: AvatarPresetId | null): ProfilePreset | null {
  return avatarId ? AVATAR_ID_TO_PROFILE_PRESET[avatarId] : null;
}

export function toAvatarId(profilePreset: string | null): AvatarPresetId | null {
  return profilePreset ? PROFILE_PRESET_TO_AVATAR_ID[profilePreset as ProfilePreset] ?? null : null;
}
