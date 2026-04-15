import { useState } from 'react'
import { cn } from '../../../lib/cn'

interface ProfileAvatarProps {
  src?: string | null
  name?: string | null
  email?: string | null
  alt?: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
}

function normalizeImageSrc(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

function profileInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || 'U'
  return source.charAt(0).toUpperCase()
}

export function ProfileAvatar({
  src,
  name,
  email,
  alt,
  className,
  imageClassName,
  fallbackClassName,
}: ProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState('')
  const normalizedSrc = normalizeImageSrc(src)
  const showImage = Boolean(normalizedSrc) && failedSrc !== normalizedSrc
  const fallbackText = profileInitial(name, email)

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-[1.75rem] border border-campus-200 bg-campus-50',
        className,
      )}
    >
      {showImage ? (
        <img
          src={normalizedSrc ?? undefined}
          alt={alt ?? `${name || email || 'User'} profile image`}
          className={cn('h-full w-full object-cover', imageClassName)}
          onError={() => setFailedSrc(normalizedSrc ?? '')}
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center bg-white text-lg font-semibold text-campus-500',
            fallbackClassName,
          )}
          aria-label="Profile image fallback"
        >
          {fallbackText}
        </span>
      )}
    </div>
  )
}
