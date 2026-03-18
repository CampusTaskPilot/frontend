import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'success' | 'warning' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const badgeVariants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  neutral: 'bg-campus-100 text-campus-700 ring-campus-200',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}
