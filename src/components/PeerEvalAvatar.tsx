import { User } from 'lucide-react'
import { AVATAR_PRESETS } from './AvatarPicker'
import { toAvatarId } from '../lib/profilePreset'

interface PeerEvalAvatarProps {
  profilePreset: string | null
  size?: 'sm' | 'md'
}

export function PeerEvalAvatar({ profilePreset, size = 'md' }: PeerEvalAvatarProps) {
  const avatarId = toAvatarId(profilePreset)
  const avatar = AVATAR_PRESETS.find((item) => item.id === avatarId)
  const sizeClass = size === 'sm' ? 'size-8' : 'size-10'

  if (avatar) {
    return (
      <img
        src={avatar.src}
        alt={`${avatar.label} 프로필`}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-primary-100`}>
      <User className="h-1/2 w-1/2 text-gray-25" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
    </span>
  )
}
