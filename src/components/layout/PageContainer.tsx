import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type PageContainerSize = 'default' | 'wide' | 'narrow'

const sizeClassName: Record<PageContainerSize, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-screen-xl',
  wide: 'max-w-screen-2xl',
}

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: PageContainerSize
}

export function PageContainer({
  className,
  size = 'wide',
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10',
        sizeClassName[size],
        className,
      )}
      {...props}
    />
  )
}
