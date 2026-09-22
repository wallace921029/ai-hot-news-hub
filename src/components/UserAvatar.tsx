import { useMemo } from 'react'
import { createAvatar, type Style } from '@dicebear/core'
import { avatarStyles, isValidAvatarConfig, type AvatarStyleKey } from '@/lib/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  avatar?: string | null
  username: string
  size?: number
  className?: string
}

export function UserAvatar({ avatar, username, size = 32, className }: UserAvatarProps) {
  const dataUri = useMemo(() => {
    if (!isValidAvatarConfig(avatar)) return null
    const [style, seed] = (avatar as string).split(':')
    const styleDef = avatarStyles[style as AvatarStyleKey] as Style<any>
    const svg = createAvatar(styleDef, { seed }).toString()
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }, [avatar])

  if (dataUri) {
    return (
      <img
        src={dataUri}
        alt={username}
        width={size}
        height={size}
        className={cn('rounded-full bg-accent', className)}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        'rounded-full bg-foreground flex items-center justify-center font-medium text-background select-none',
        className
      )}
    >
      {username?.charAt(0).toUpperCase()}
    </div>
  )
}
