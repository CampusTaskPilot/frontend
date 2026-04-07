import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { PageContainer } from './PageContainer'

type SectionSize = 'default' | 'wide' | 'narrow'

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  contentClassName?: string
  size?: SectionSize
}

export function Section({
  children,
  className,
  contentClassName,
  size = 'wide',
  ...props
}: SectionProps) {
  return (
    <section className={cn('py-16 sm:py-20 lg:py-24', className)} {...props}>
      <PageContainer className={contentClassName} size={size}>
        {children}
      </PageContainer>
    </section>
  )
}
