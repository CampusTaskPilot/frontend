import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'panel-surface rounded-[1.75rem] p-5 text-campus-900 transition duration-200 sm:p-6',
        className,
      )}
      {...props}
    />
  )
}
