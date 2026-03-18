import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-campus-200 bg-white p-6 text-campus-900 shadow-card',
        className,
      )}
      {...props}
    />
  )
}
