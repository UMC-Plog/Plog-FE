import { UserRound } from 'lucide-react'
import { AVATAR_PRESETS } from '../AvatarPicker'
import { toAvatarId, type ProfilePreset } from '../../lib/profilePreset'

interface PostAuthorAvatarProps {
  profilePreset: ProfilePreset | null
  className?: string
}

export function PostAuthorAvatar({
  profilePreset,
  className = 'h-10 w-10',
}: PostAuthorAvatarProps) {
  const avatarId = toAvatarId(profilePreset)
  const avatar = AVATAR_PRESETS.find((item) => item.id === avatarId)

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 ${className}`}
    >
      {avatar ? (
        <img src={avatar.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <UserRound className="h-1/2 w-1/2 text-gray-400" aria-hidden />
      )}
    </span>
  )
}
