import { useMemo, useState } from 'react'
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

function teamInitial(teamName: string) {
  const initial = teamName.trim().charAt(0).toUpperCase()
  return initial || 'T'
}

function placeholderTone(seed: string) {
  const tones = [
    'from-sky-500/35 via-brand-500/20 to-accent-400/25',
    'from-emerald-500/30 via-cyan-500/15 to-brand-500/25',
    'from-amber-500/30 via-rose-400/15 to-brand-500/20',
    'from-brand-500/35 via-indigo-500/10 to-teal-400/30',
  ]

  const value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return tones[value % tones.length]
}

export function TeamProfileImage({
  src,
  alt,
  teamName,
  summary,
  category,
  className,
  imageClassName,
  priority = 'hero',
}: TeamProfileImageProps) {
  const [failedSrc, setFailedSrc] = useState('')
  const [loadedSrc, setLoadedSrc] = useState('')
  const gradientTone = useMemo(() => placeholderTone(teamName), [teamName])
  const normalizedSrc = src ?? ''
  const showImage = Boolean(src) && failedSrc !== normalizedSrc
  const isLoaded = !src || loadedSrc === normalizedSrc || failedSrc === normalizedSrc

  return (
    <div className={cn('relative overflow-hidden bg-campus-950', className)}>
      {showImage && (
        <>
          <img
            src={src ?? undefined}
            alt={alt}
            className={cn('h-full w-full object-cover', imageClassName)}
            onLoad={() => setLoadedSrc(normalizedSrc)}
            onError={() => setFailedSrc(normalizedSrc)}
          />
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.18),rgba(255,255,255,0.05))] bg-[length:220%_100%]" />
          )}
        </>
      )}

      {!showImage && (
        <div className={cn('absolute inset-0 bg-gradient-to-br', gradientTone, priority === 'hero' ? 'from-0% to-100%' : '')}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_35%)]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />

          <div className="relative flex h-full flex-col justify-between p-6 text-white">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-white/20 bg-white/10 text-2xl font-semibold backdrop-blur">
              {teamInitial(teamName)}
            </div>

            <div className="space-y-3">
              {category && (
                <span className="inline-flex max-w-full rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
                  {category}
                </span>
              )}
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">{teamName}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/78">
                  {summary?.trim() || 'Add a cover image to personalize this workspace.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
