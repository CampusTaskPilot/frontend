import { useState } from 'react'
import { cn } from '../../../lib/cn'

interface TeamProfileImageProps {
  src?: string | null
  alt: string
  teamName: string
  summary?: string | null
  category?: string | null
  className?: string
  imageClassName?: string
  priority?: 'hero' | 'editor'
}

function normalizeImageSrc(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

function teamInitial(teamName: string) {
  return teamName.trim().charAt(0).toUpperCase() || 'T'
}

function FallbackCover({
  teamName,
  priority,
}: {
  teamName: string
  priority: 'hero' | 'editor'
}) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f3f7ff_0%,#e8eef8_100%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'flex items-center justify-center border border-campus-200 bg-white font-semibold tracking-tight text-campus-900 shadow-sm',
            priority === 'hero'
              ? 'h-24 w-24 rounded-[28px] text-4xl sm:h-28 sm:w-28 sm:text-5xl'
              : 'h-20 w-20 rounded-[24px] text-3xl sm:h-24 sm:w-24 sm:text-4xl',
          )}
        >
          {teamInitial(teamName)}
        </div>
      </div>
    </>
  )
}

export function TeamProfileImage({
  src,
  alt,
  teamName,
  className,
  imageClassName,
  priority = 'hero',
}: TeamProfileImageProps) {
  const [failedSrc, setFailedSrc] = useState('')
  const [loadedSrc, setLoadedSrc] = useState('')
  const normalizedSrc = normalizeImageSrc(src)
  const showImage = Boolean(normalizedSrc) && failedSrc !== normalizedSrc
  const isLoaded = !normalizedSrc || loadedSrc === normalizedSrc || failedSrc === normalizedSrc

  return (
    <div className={cn('relative overflow-hidden bg-campus-900', className)}>
      {showImage ? (
        <>
          <img
            src={normalizedSrc ?? undefined}
            alt={alt}
            className={cn('h-full w-full object-cover', imageClassName)}
            onLoad={() => setLoadedSrc(normalizedSrc ?? '')}
            onError={() => setFailedSrc(normalizedSrc ?? '')}
          />
          <div
            className={cn(
              'absolute inset-0',
              priority === 'hero'
                ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.16)_42%,rgba(15,23,42,0.48)_100%)]'
                : 'bg-[linear-gradient(180deg,rgba(15,23,42,0.12)_0%,rgba(15,23,42,0.28)_100%)]',
            )}
          />
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.04),rgba(255,255,255,0.14),rgba(255,255,255,0.04))] bg-[length:220%_100%]" />
          )}
        </>
      ) : (
        <FallbackCover teamName={teamName} priority={priority} />
      )}

      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  )
}
